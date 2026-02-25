import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Modal } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar } from 'lucide-react-native';
import { Colors, Layout } from '@/constants/Colors';

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
      return value.toLocaleDateString('en-GB');
    } else if (mode === 'time') {
      return value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return `${value.toLocaleDateString('en-GB')} ${value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      {Platform.OS === 'web' ? (
        <View style={styles.webInputContainer}>
          <Calendar size={18} color={Colors.primary} />
          <input
            type={mode === 'time' ? 'time' : 'date'}
            value={value ? (mode === 'time' ? value.toTimeString().slice(0, 5) : value.toISOString().split('T')[0]) : ''}
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
          <Calendar size={18} color={Colors.primary} />
          <Text style={[styles.buttonText, !value && styles.placeholderText]}>{formatDisplay()}</Text>
        </TouchableOpacity>
      )}

      {showPicker && Platform.OS !== 'web' && (
        <DateTimePicker
          value={value || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          themeVariant="dark"
        />
      )}

      {showTimePicker && Platform.OS !== 'web' && (
        <DateTimePicker
          value={value || new Date()}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimeChange}
          themeVariant="dark"
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
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text.secondary,
    marginBottom: 8,
    marginLeft: 4,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Layout.radius.lg,
    backgroundColor: Colors.background,
    gap: 10,
  },
  buttonText: {
    fontSize: 15,
    color: Colors.text.primary,
    fontWeight: '600',
    flex: 1,
  },
  placeholderText: {
    color: Colors.text.tertiary,
  },
  webInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Layout.radius.lg,
    backgroundColor: Colors.background,
    gap: 10,
  },
  webInput: {
    flex: 1,
    fontSize: 15,
    borderWidth: 0,
    backgroundColor: 'transparent',
    color: Colors.text.primary,
    fontWeight: '600',
    outlineStyle: 'none',
  } as any,
});
