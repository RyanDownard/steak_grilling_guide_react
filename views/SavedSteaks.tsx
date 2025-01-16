import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { SavedSteak, removeAnySavedSteakInfo } from '../data/SteakData';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPencil, faTrash } from '@fortawesome/free-solid-svg-icons';
import globalStyles from '../styles/globalStyles';
import { useSavedSteaks } from '../contexts/SavedSteaksContext';
import EditSavedSteakModal from '../components/EditSavedSteakModal';



const SavedSteaks = () => {
    const { savedSteaks, removeSavedSteak } = useSavedSteaks();
    const [editingSteak, setEditingSteak] = useState<SavedSteak | null>(null);
    const [editSavedSteakModalVisible, setEditSavedSteakmodalVisible] = useState(false);

    const handleEditSteak = (steak: SavedSteak) => {
        setEditingSteak(steak);
        setEditSavedSteakmodalVisible(true);
    };

    const handleDeleteSteak = (steak: SavedSteak) => {
        removeSavedSteak(steak);
        removeAnySavedSteakInfo(steak.id);
    };

    return (
        <View>
            <FlatList
                data={savedSteaks}
                keyExtractor={(item: SavedSteak) => item.id.toString()}
                renderItem={({ item }) =>
                    <View style={styles.container}>
                        <Text style={styles.savedSteakName}>{item.personName}</Text>
                        <Text style={styles.savedSteakCook}>{item.centerCook}</Text>
                        <TouchableOpacity onPress={() => handleEditSteak(item)} style={[globalStyles.actionButton, globalStyles.editButton]}>
                            <FontAwesomeIcon icon={faPencil} size={24} color={'#e3cf17'} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteSteak(item.id)} style={[globalStyles.actionButton, globalStyles.deleteButton]}>
                            <FontAwesomeIcon icon={faTrash} size={24} color={'#c70404'} />
                        </TouchableOpacity>
                    </View>
                }
            />

            <EditSavedSteakModal
                onClose={() => {setEditSavedSteakmodalVisible(false); setEditingSteak(null)}}
                visible={editSavedSteakModalVisible}
                editingSteak={editingSteak}/>

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
