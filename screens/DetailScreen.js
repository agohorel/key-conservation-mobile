import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

export default function HomeScreen() {
  return (
    <ScrollView style={styles.container}>
      <Text>Detail Screen</Text>
    </ScrollView>
  );
}

HomeScreen.navigationOptions = {
  title: 'Home'
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 15,
    backgroundColor: '#fff'
  }
});
