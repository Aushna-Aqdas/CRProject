import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

const Pagination = ({
  pagination,
  onFirst,
  onPrev,
  onNext,
  onLast,
}) => {
  if (!pagination || pagination.total === 0) return null;

  const {
    current_page,
    last_page,
    from,
    to,
    total,
  } = pagination;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        Showing {from}-{to} of {total}
      </Text>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.button, current_page === 1 && styles.disabled]}
          onPress={onFirst}
          disabled={current_page === 1}
        >
          <Icon name="step-backward" size={14} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, current_page === 1 && styles.disabled]}
          onPress={onPrev}
          disabled={current_page === 1}
        >
          <Icon name="chevron-left" size={14} />
        </TouchableOpacity>

        <Text style={styles.page}>
          Page {current_page} of {last_page}
        </Text>

        <TouchableOpacity
          style={[
            styles.button,
            current_page === last_page && styles.disabled,
          ]}
          onPress={onNext}
          disabled={current_page === last_page}
        >
          <Icon name="chevron-right" size={14} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            current_page === last_page && styles.disabled,
          ]}
          onPress={onLast}
          disabled={current_page === last_page}
        >
          <Icon name="step-forward" size={14} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderBlockColor:'#a7a3a3e1',
    borderRadius:6,
    marginBottom: -15, // 👈 ADD THIS
  },
  text: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    marginBottom: 10,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    padding: 8,
    marginHorizontal: 5,
    borderRadius: 6,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  disabled: {
    opacity: 0.5,
  },
  page: {
    marginHorizontal: 55,
    color: '#2C3E50',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default Pagination;
