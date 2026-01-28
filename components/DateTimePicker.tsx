import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Modal } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar } from 'lucide-react-native';

interface DateTimePickerProps {
  value: Date | null;
  onChange: (date: Date) => void;
  placeholder?: string;
  label?: string;
  mode?: 'date' | 'time' | 'datetime';
}

export default function DateTimePickerComponent({
  value,
  onChange,
  placeholder = 'Select date',
  label,
  mode = 'date',
}: DateTimePickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const handleDateChange = (event: any, selectedDate: Date | undefined) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (selectedDate) {
      if (mode === 'datetime') {
        setShowTimePicker(true);
      } else {
        onChange(selectedDate);
      }
    }
  };

  const handleTimeChange = (event: any, selectedTime: Date | undefined) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (selectedTime && value) {
      const combined = new Date(value);
      combined.setHours(selectedTime.getHours());
      combined.setMinutes(selectedTime.getMinutes());
      onChange(combined);
    }
    if (Platform.OS === 'ios' && mode === 'datetime') {
      setShowTimePicker(false);
    }
  };

  const formatDisplay = () => {
    if (!value) return placeholder;
    if (mode === 'date') {
      return value.toISOString().split('T')[0];
    } else if (mode === 'time') {
      return value.toTimeString().slice(0, 5);
    } else {
      return `${value.toISOString().split('T')[0]} ${value.toTimeString().slice(0, 5)}`;
    }
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      {Platform.OS === 'web' ? (
        <View style={styles.webInputContainer}>
          <Calendar size={20} color="#666" />
          <input
            type={mode === 'time' ? 'time' : 'date'}
            value={formatDisplay()}
            onChange={(e) => {
              if (e.target.value) {
                if (mode === 'time') {
                  const [h, m] = e.target.value.split(':');
                  const newDate = value || new Date();
                  newDate.setHours(parseInt(h), parseInt(m));
                  onChange(newDate);
                } else {
                  const newDate = new Date(e.target.value + 'T00:00:00');
                  onChange(newDate);
                }
              }
            }}
            style={styles.webInput}
          />
        </View>
      ) : (
        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            if (mode === 'time') {
              setShowTimePicker(true);
            } else {
              setShowPicker(true);
            }
          }}
        >
          <Calendar size={20} color="#0066cc" />
          <Text style={styles.buttonText}>{formatDisplay()}</Text>
        </TouchableOpacity>
      )}

      {showPicker && Platform.OS !== 'web' && (
        <DateTimePicker
          value={value || new Date()}
          mode="date"
          display="spinner"
          onChange={handleDateChange}
        />
      )}

      {showTimePicker && Platform.OS !== 'web' && (
        <DateTimePicker
          value={value || new Date()}
          mode="time"
          display="spinner"
          onChange={handleTimeChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    gap: 8,
  },
  buttonText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  webInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    gap: 8,
  },
  webInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 4,
    border: 'none',
    backgroundColor: 'transparent',
    color: '#333',
  } as any,
});
