import {createStaticNavigation} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {BluetoothScreen} from './android/app/src/screens/BluetoothScreen';
import {ControlScreen} from './android/app/src/screens/ControlScreen';
import {MapScreen} from './android/app/src/screens/MapScreen';
import {MessagesScreen} from './android/app/src/screens/MessagesScreen';
import {Text} from 'react-native';

const RootTabs = createBottomTabNavigator({
  screenOptions: {
    tabBarActiveTintColor: '#2563eb',
    tabBarInactiveTintColor: '#64748b',
    headerStyle: {
      backgroundColor: '#ffffff',
    },
    headerTitleStyle: {
      fontWeight: '900',
    },
    freezeOnBlur: true,
  },
  screens: {
    Bluetooth: {
      screen: BluetoothScreen,
      options: {
        title: 'Robot',
        tabBarIcon: ({color}) => <Text style={{color, fontSize: 20}}>ᛒ</Text>,
      },
    },
    Control: {
      screen: ControlScreen,
      options: {
        title: 'Control',
        tabBarIcon: ({color}) => <Text style={{color, fontSize: 20}}>🎮</Text>,
      },
    },
    Map: {
      screen: MapScreen,
      options: {
        title: 'Map',
        tabBarIcon: ({color}) => <Text style={{color, fontSize: 20}}>🗺️</Text>,
      },
    },
    Messages: {
      screen: MessagesScreen,
      options: {
        title: 'Messages',
        tabBarIcon: ({color}) => <Text style={{color, fontSize: 20}}>▤</Text>,
      },
    },
  },
});

const Navigation = createStaticNavigation(RootTabs);

export default function App() {
  return <Navigation />;
}