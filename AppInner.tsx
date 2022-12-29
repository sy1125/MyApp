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
            // token refresh 요청
            const { data } = await axios.post(
              `${Config.API_URL}/refreshToken`, // token refresh api
              {},
              { headers: { authorization: `Bearer ${refreshToken}` } },
            );
            // 새로운 토큰 저장
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
          Alert.alert('알림', '다시 로그인 해주세요.');
        }
      } finally {
        // TODO: 스플래시 스크린 없애기
        SplashScreen.hide();
      }
    };
    getTokenAndRefresh();
  }, [dispatch]);

  return (
    <NavigationContainer>
      {isLoggedIn ? (
        <Tab.Navigator>
          <Tab.Screen
            name="Orders"
            component={Orders}
            options={{
              title: '오더 목록',
              tabBarIcon: () => <FontAwesome5Icon name="list" size={20} />
            }}
          />
          <Tab.Screen
            name="Delivery"
            component={Delivery}
            options={{
              headerShown: false,
              title: '지도',
              tabBarIcon: () => <FontAwesome5Icon name="map" size={20} />
            }}
          />
          <Tab.Screen
            name="Settings"
            component={Settings}
            options={{
              title: '내 정보',
              unmountOnBlur: true,
              tabBarIcon: () => <FontAwesomeIcon name="gear" size={20} />
            }}
          />
        </Tab.Navigator>
      ) : (
        <Stack.Navigator>
          <Stack.Screen
            name="SignIn"
            component={SignIn}
            options={{ title: '로그인' }}
          />
          <Stack.Screen
            name="SignUp"
            component={SignUp}
            options={{ title: '회원가입' }}
          />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  )
}

export default AppInner;