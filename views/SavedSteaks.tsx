import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SavedSteak } from '../data/SteakData';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPencil, faTrash } from '@fortawesome/free-solid-svg-icons';
import globalStyles from '../styles/globalStyles';
import useSavedSteaksStore from '../stores/SavedSteakStore';
import EditSavedSteakModal from '../components/EditSavedSteakModal';
import useSteakStore from '../stores/SteakStore';
import useTimerStore from '../stores/TimerStore';

const SavedSteaks = () => {
    const { removeAnySavedSteakInfo } = useSteakStore();
    const { timerRunning } = useTimerStore();
    const { savedSteaks, removeSavedSteak } = useSavedSteaksStore();
    const [editingSteak, setEditingSteak] = useState<SavedSteak | null>(null);
    const [editSavedSteakModalVisible, setEditSavedSteakmodalVisible] = useState(false);

    const handleEditSteak = (steak: SavedSteak) => {
        setEditingSteak(steak);
        setEditSavedSteakmodalVisible(true);
    };

    const handleDeleteSteak = (steak: SavedSteak) => {
        Alert.alert(
            'Delete Saved Steak?',
            `Are you sure you want to delete saved steak for ${steak.personName}?`,
            [
                {
                    text: 'Yes',
                    onPress: () => {
                        removeSavedSteak(steak.id);
                        removeAnySavedSteakInfo(steak.id);
                    },
                },
                {
                    text: 'No',
                },
            ],
            { cancelable: false },
        );
    };

    return (
        <View>
            <FlatList
                data={savedSteaks}
                keyExtractor={(item: SavedSteak) => item.id.toString()}
                renderItem={({ item }) =>
                    <View style={styles.container}>
                        <View style={styles.infoContainer}>
                            <Text style={styles.savedSteakName}>{item.personName}</Text>
                            <Text style={styles.savedSteakCook}>{item.centerCook}</Text>
                        </View>
                        <TouchableOpacity onPress={() => handleEditSteak(item)} disabled={timerRunning} style={[globalStyles.actionButton, globalStyles.editButton, timerRunning && globalStyles.disabledButton]}>
                            <FontAwesomeIcon icon={faPencil} size={24} color={timerRunning ? '#949799' : '#e3cf17'} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteSteak(item)} disabled={timerRunning} style={[globalStyles.actionButton, globalStyles.deleteButton, timerRunning && globalStyles.disabledButton]}>
                            <FontAwesomeIcon icon={faTrash} size={24} color={timerRunning ? '#949799' : '#c70404'} />
                        </TouchableOpacity>
                    </View>
                }
            />

            <EditSavedSteakModal
                onClose={() => { setEditSavedSteakmodalVisible(false); setEditingSteak(null); }}
                visible={editSavedSteakModalVisible}
                editingSteak={editingSteak} />

        </View>
    );
};

export default SavedSteaks;

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: '#eee',
        padding: 20,
        alignItems: 'center',
    },
    infoContainer: {
        flex: 2,
        flexDirection: 'column',
    },
    savedSteakName: {
        flex: 1,
        fontSize: 20,
        fontWeight: 'bold',
    },
    savedSteakCook: {
        flex: 1,
        textAlign: 'left',
    },
    editContainer: {
        flex: 1,
    },
    deleteContainer: {
        flex: 1,
    },
});
