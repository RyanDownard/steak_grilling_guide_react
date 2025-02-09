import React, { useState, useEffect } from 'react';
import { Text, StyleSheet, SafeAreaView, Alert, Linking } from 'react-native';
import SteakModal from '../components/SteakModal';
import BeforeYouGrill from '../components/BeforeYouGrill';
import StartTimerModal from '../components/StartTimerModal.tsx';
import TopButtons from '../components/TopButtons';
import SteakList from '../components/SteakList.tsx';
import { library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';
import notifee, { TimestampTrigger, TriggerType, AuthorizationStatus } from '@notifee/react-native';
import StopTimerModal from '../components/StopTimerModal.tsx';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTimer } from '../contexts/TimerContext.tsx';
import { useSteakContext } from '../contexts/SteaksContext.tsx';
import { Steak } from '../data/SteakData.tsx';


const Home = () => {
  const { duration, timerRunning, stopContextTimer, setDuration, setTimerRunning, setEndTime, setRemainingTime } = useTimer();
  const { steaks, addSteak, editSteak, updateSteaks } = useSteakContext();
  const [modalVisible, setModalVisible] = useState(false);
  const [stopTimerModalVisible, setStopTimerModalVisible] = useState(false);
  const [beforeYouGrillVisible, setBeforeYouGrillVisible] = useState(false);
  const [startTimeModalVisible, setStartTimerModalVisible] = useState(false);
  const [editingSteak, setEditingSteak] = useState<Steak | null>(null);

  library.add(fas);

  const scheduleNotification = async (title: string, body: string, secondsFromNow: number) => {
    try {
      const triggerTime = Date.now() + secondsFromNow * 1000;

      const trigger: TimestampTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: triggerTime,
      };

      await notifee.createChannel({
        id: 'sound',
        name: 'Steak Timer Notifications',
        sound: 'default',
      });

      await notifee.createTriggerNotification(
        {
          title,
          body,
          android: {
            channelId: 'sound',
            smallIcon: 'ic_launcher',
            sound: 'default',
            showChronometer: true,
            chronometerDirection: 'down',
            timestamp: Date.now() + secondsFromNow * 1000,
            badgeCount: 1,
          },
          ios: {
            interruptionLevel: 'timeSensitive',
            sound: 'default',
            badgeCount: 1,
          },
        },
        trigger
      );

      console.log(`Notification scheduled: ${title} - ${body} at ${new Date(triggerTime)}`);
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  };

  const groupSteaksByTime = (steaksToGroup: Steak[], action: 'place' | 'flip') => {
    const grouped: Record<number, string[]> = {};

    steaksToGroup.forEach((steak) => {
      let time = 0;
      let diffTime = duration - steak.totalCookingTime();
      if (action === 'place') {
        time = steak.totalCookingTime();
      }
      else if (action === 'flip') {
        time = steak.firstSideTime + diffTime;
      }
      console.log(time);
      if (!grouped[time]) { grouped[time] = []; }
      grouped[time].push(steak.personName);
    });

    return grouped;
  };

  const scheduleGroupedNotifications = async (groupedSteaks: Steak[]) => {
    const placeGrouped = groupSteaksByTime(groupedSteaks, 'place');
    for (const [time, names] of Object.entries(placeGrouped)) {
      await scheduleNotification(
        'Place Steaks',
        `It's time to place ${names.join(' and ')}'s ${names.length === 1 ? 'steak' : 'steaks'} on the grill!`,
        duration - Number(time)
      );
    }

    const flipGrouped = groupSteaksByTime(steaks, 'flip');
    for (const [time, names] of Object.entries(flipGrouped)) {
      await scheduleNotification(
        'Flip Steaks',
        `Time to flip ${names.join(' and ')}'s ${names.length === 1 ? 'steak' : 'steaks'}!`,
        Number(time)
      );
    }
  };

  const showStopTimerModal = () => {
    setStopTimerModalVisible(true);
  };


  const handleSave = (steak: Steak) => {
    if (editingSteak) {
      const index = steaks.indexOf(editingSteak);
      editSteak(index, steak);
    } else {
      addSteak(steak);
    }
    setEditingSteak(null);
  };

  const handleOnAddSteak = () => {
    setModalVisible(true);
  };

  const showDeleteConfirm = (steakToDelete: Steak) => {
    Alert.alert(
      'Delete Steak?',
      `Are you sure you want to delete ${steakToDelete.personName}'s steak?`,
      [
        {
          text: 'Yes',
          onPress: () => handleDelete(steakToDelete),
        },
        {
          text: 'No',
        },
      ],
      { cancelable: false },
    );
  };

  const handleDelete = (steakToDelete: Steak) => {
    if (steakToDelete) {
      const updatedSteaks = steaks.filter((steak) => steak !== steakToDelete);

      updateSteaks(updatedSteaks);
    }
  };

  const stopTimer = async () => {
    setStopTimerModalVisible(false);
    stopContextTimer();
    notifee.cancelAllNotifications();
  };

  const startTimer = async () => {
    let permission = await notifee.requestPermission({
      sound: true,
      announcement: true,
      alert: true,
    });

    if (permission.authorizationStatus === AuthorizationStatus.DENIED) {
      Alert.alert(
        'Notification Permission Required',
        'This app needs notification permissions to notify you about steak timers. Please enable them in the app settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => Linking.openSettings(),
          },
        ]
      );
      return;
    }

    setStartTimerModalVisible(false);
    const now = new Date();
    const calculatedEndTime = new Date(now.getTime() + duration * 1000);
    setEndTime(calculatedEndTime);
    setTimerRunning(true);

    try {
      const dataToSave = {
        steaks,
        endTime: calculatedEndTime.toISOString(),
        remainingTime: duration,
      };
      await AsyncStorage.setItem('steakTimerData', JSON.stringify(dataToSave));
      console.log('Timer and steaks saved.');
    } catch (error) {
      console.error('Failed to save timer and steaks:', error);
    }

    await scheduleGroupedNotifications(steaks);
    await scheduleCompleteNotification(calculatedEndTime);
  };

  const scheduleCompleteNotification = async (calculatedEndTime: Date) => {
    const date = calculatedEndTime;

    const channelId = await notifee.createChannel({
      id: 'steak-timer',
      name: 'Steak Timer Notifications',
      importance: 4,
      sound: 'default',
      vibration: true,
      lights: true,
    });

    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: date.getTime(),
    };

    await notifee.createTriggerNotification(
      {
        title: 'Steaks Ready',
        body: steaks.length === 1 ? 'Steak is done!' : 'Steaks are done!',
        android: {
          channelId: channelId,
          importance: 4,
          sound: 'default',
        },
        ios: {
          interruptionLevel: 'timeSensitive',
          sound: 'default',

        },
      },
      trigger
    );
  };

  const handleEdit = (steak: any) => {
    setEditingSteak(steak);
    setModalVisible(true);
  };

  const checkShowBeforeYouGrillModal = async () => {
    try {
      const value = await AsyncStorage.getItem('hideInfoModalOnStart');
      if (value === undefined || value !== 'true') {
        setBeforeYouGrillVisible(true);
      }
    } catch (error) {
      console.error('Error reading stored value:', error);
    }
  };

  useEffect(() => {
    setDuration(Math.max(...steaks.map((calcSteak) => calcSteak.firstSideTime + calcSteak.secondSideTime)));
  }, [steaks, setDuration]);

  useEffect(() => {
    const loadSteakData = async () => {
      try {
        const savedData = await AsyncStorage.getItem('steakTimerData');

        if (savedData) {
          const { steaks: savedSteaks, endTime: savedEndTime } = JSON.parse(savedData);

          const now = new Date();
          const endsAt = new Date(savedEndTime);
          const diffInSeconds = Math.floor((endsAt.getTime() - now.getTime()) / 1000);

          if (diffInSeconds > 0) {
            updateSteaks(savedSteaks);
            setEndTime(endsAt);
            setRemainingTime(diffInSeconds);
            setTimerRunning(true);
          } else {
            // If the timer expired, reset
            await AsyncStorage.removeItem('steakTimerData');
            Alert.alert('Unexpected Close',
              "The app closed unexpectedly, if it's on us, we hope your steaks still turned out great and apologize for the inconvinence.");
          }
        }
      } catch (error) {
        console.error('Failed to load timer and steaks data:', error);
      }
    };

    loadSteakData();
  }, [setEndTime, setRemainingTime, setTimerRunning, updateSteaks]);

  useEffect(() => {
    checkShowBeforeYouGrillModal();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <TopButtons
        onAdd={() => handleOnAddSteak()}
        onPause={() => {
          showStopTimerModal();
        }}
        onInfo={() => setBeforeYouGrillVisible(true)}
        onStart={() => setStartTimerModalVisible(true)}
        pauseEnabled={timerRunning}
        startEnabled={!timerRunning && steaks.length > 0}
      />
      {(!steaks || steaks.length === 0) && (
        <Text onPress={() => setModalVisible(true)} style={styles.noneAddedText}>
          No Steaks Added
        </Text>
      )}
      <SteakList
        steaks={steaks}
        onEdit={handleEdit}
        onDelete={showDeleteConfirm}
        actionsDisabled={timerRunning} />

      <SteakModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setEditingSteak(null);
        }}
        onSave={handleSave}
        editingSteak={editingSteak}
      />

      <BeforeYouGrill
        visible={beforeYouGrillVisible} onClose={() => setBeforeYouGrillVisible(false)}
        />

      <StopTimerModal
        visible={stopTimerModalVisible} onClose={() => setStopTimerModalVisible(false)}
        onStop={stopTimer}
        />

      <StartTimerModal
        visible={startTimeModalVisible}
        steaks={steaks}
        onClose={() => setStartTimerModalVisible(false)}
        onStart={startTimer}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  longestTime: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'black',
  },
  noneAddedText: {
    textAlign: 'center',
    margin: 20,
    fontSize: 20,
  },
});

export default Home;
