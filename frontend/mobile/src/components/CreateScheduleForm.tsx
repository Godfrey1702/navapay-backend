import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import { useCreateSchedule } from '../../../shared/hooks/useSchedules';

export default function CreateScheduleForm() {
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const create = useCreateSchedule();

  const onCreate = async () => {
    const payload = { amount: Number(amount), phoneNumber: phone, category: 'AIRTIME', provider: 'MTN', frequency: 'MONTHLY', startDate: new Date().toISOString() };
    try {
      await create.mutateAsync(payload);
      Alert.alert('Schedule created');
      setAmount('');
      setPhone('');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to create schedule');
    }
  };

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ marginBottom: 8 }}>Create Schedule</Text>
      <TextInput value={amount} onChangeText={setAmount} placeholder="Amount" keyboardType="numeric" style={{ borderWidth: 1, padding: 8, marginBottom: 8 }} />
      <TextInput value={phone} onChangeText={setPhone} placeholder="Phone number" style={{ borderWidth: 1, padding: 8, marginBottom: 8 }} />
      <Button title={create.isLoading ? 'Creating...' : 'Create'} onPress={onCreate} disabled={create.isLoading} />
    </View>
  );
}
