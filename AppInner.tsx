import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Settings from './src/pages/Settings';
import Orders from './src/pages/Orders';
import Delivery from './src/pages/Delivery';
import SignIn from './src/pages/SignIn';
import SignUp from './src/pages/SignUp';
import { RootState } from './src/store/reducer';
import { useSelector } from 'react-redux';
import useSocket from './src/hooks/useSocket';
import { useEffect } from 'react';
import EncryptedStorage from 'react-native-encrypted-storage';
import axios, { AxiosError } from 'axios';
import { useAppDispatch } from './src/store';
import Config from 'react-native-config';
import userSlice from './src/slices/user';
import { Alert } from 'react-native';
import orderSlice from './src/slices/order';
import usePermissions from './src/hooks/usePermissions';
import SplashScreen from 'react-native-splash-screen';
import FontAwesome5Icon from 'react-native-vector-icons/FontAwesome5';
import FontAwesomeIcon from 'react-native-vector-icons/FontAwesome';
import messaging from '@react-native-firebase/messaging';


export type LoggedInParamList = {
  Orders: undefined;
  Settings: undefined;
  Delivery: undefined;
  Complete: { orderId: string };
};
export type RootStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
};

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<RootStackParamList>();

function AppInner() {
  const dispatch = useAppDispatch();
  const isLoggedIn = useSelector((state: RootState) => !!state.user.email);
  const [socket, disconnect] = useSocket();

  usePermissions();

  useEffect(() => {
    axios.interceptors.response.use(
      response => response,
      async (error) => {
        const { response: { status } } = error;
        if (status === 419) {
          if (error.response.data.code === 'expired') {
            const originalRequest = error.config;
            const refreshToken = await EncryptedStorage.getItem('refreshToken');
            // token refresh ??????
            const { data } = await axios.post(
              `${Config.API_URL}/refreshToken`, // token refresh api
              {},
              { headers: { authorization: `Bearer ${refreshToken}` } },
            );
            // ????????? ?????? ??????
            dispatch(userSlice.actions.setAccessToken(data.data.accessToken));
            originalRequest.headers.authorization = `Bearer ${data.data.accessToken}`;
            return axios(originalRequest);
          }
        };
        return Promise.reject(error);
      });
  }, [dispatch])

  useEffect(() => {
    const callback = (data: any) => {
      console.log(data);
      dispatch(orderSlice.actions.addOrder(data));
    };
    if (socket && isLoggedIn) {
      socket.emit('acceptOrder', 'hello');
      socket.on('order', callback);
    }
    return () => {
      if (socket) {
        socket.off('order', callback);
      }
    };
  }, [isLoggedIn, socket]);

  useEffect(() => {
    if (!isLoggedIn) {
      console.log('!isLoggedIn', !isLoggedIn);
      disconnect();
    }
  }, [dispatch, isLoggedIn, disconnect]);

  useEffect(() => {
    const getTokenAndRefresh = async () => {
      try {
        const token = await EncryptedStorage.getItem('refreshToken');
        if (!token) {
          SplashScreen.hide();
          return;
        }
        const response = await axios.post(
          `${Config.API_URL}/refreshToken`,
          {},
          {
            headers: {
              authorization: `Bearer ${token}`,
            },
          },
        );
        dispatch(
          userSlice.actions.setUser({
            name: response.data.data.name,
            email: response.data.data.email,
            accessToken: response.data.data.accessToken,
          }),
        );
      } catch (error) {
        console.error(error);
        if ((error as AxiosError<{ code: string }>).response?.data.code === 'expired') {
          Alert.alert('??????', '?????? ????????? ????????????.');
        }
      } finally {
        // TODO: ???????????? ????????? ?????????
        SplashScreen.hide();
      }
    };
    getTokenAndRefresh();
  }, [dispatch]);

  // ?????? ??????
  useEffect(() => {
    async function getToken() {
      try {
        if (!messaging().isDeviceRegisteredForRemoteMessages) {
          await messaging().registerDeviceForRemoteMessages();
        }
        const token = await messaging().getToken();
        console.log('phone token', token);
        dispatch(userSlice.actions.setPhoneToken(token));
        return axios.post(`${Config.API_URL}/phonetoken`, { token });
      } catch (error) {
        console.error(error);
      }
    }
    getToken();
  }, [dispatch]);

  return (
    <NavigationContainer>
      {isLoggedIn ? (
        <Tab.Navigator>
          <Tab.Screen
            name="Orders"
            component={Orders}
            options={{
              title: '?????? ??????',
              tabBarIcon: ({ color }) => (
                <FontAwesome5Icon name="list" size={20} style={{ color }} />
              ),
              tabBarActiveTintColor: 'blue',
            }}
          />
          <Tab.Screen
            name="Delivery"
            component={Delivery}
            options={{
              headerShown: false,
              title: '??????',
              tabBarIcon: ({ color }) => (
                <FontAwesome5Icon name="map" size={20} style={{ color }} />
              ),
              tabBarActiveTintColor: 'blue',
            }}
          />
          <Tab.Screen
            name="Settings"
            component={Settings}
            options={{
              title: '??? ??????',
              unmountOnBlur: true,
              tabBarIcon: ({ color }) => (
                <FontAwesomeIcon name="gear" size={20} style={{ color }} />
              ),
              tabBarActiveTintColor: 'blue',
            }}
          />
        </Tab.Navigator>
      ) : (
        <Stack.Navigator>
          <Stack.Screen
            name="SignIn"
            component={SignIn}
            options={{ title: '?????????' }}
          />
          <Stack.Screen
            name="SignUp"
            component={SignUp}
            options={{ title: '????????????' }}
          />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  )
}

export default AppInner;