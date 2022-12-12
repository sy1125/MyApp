import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import React, { useCallback, useState } from 'react';
import orderSlice, { Order } from '../slices/order';
import { useAppDispatch } from '../store';
import axios, { AxiosError } from 'axios';
import Config from 'react-native-config';
import { useSelector } from 'react-redux';
import { RootState } from '../store/reducer';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { LoggedInParamList } from '../../AppInner';
import EncryptedStorage from 'react-native-encrypted-storage/lib/typescript/EncryptedStorage';



function EachOrder({ item }: { item: Order }) {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<NavigationProp<LoggedInParamList>>();
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(false);
  const accessToken = useSelector((state: RootState) => state.user.accessToken);
  const toggleDetail = useCallback(() => {
    setDetail(prev => !prev);
  }, []);

  const onAccept = useCallback(async () => {
    try {
      setLoading(false);
      await axios.post(
        `${Config.API_URL}/accept`,
        { orderId: item.orderId },
        { headers: { authorization: `Bearer ${accessToken}` } },
      );
      dispatch(orderSlice.actions.acceptOrder(item.orderId));
      navigation.navigate('Delivery');
    }
    catch (error) {
      let errorResponse = (error as AxiosError).response;
      if (errorResponse?.status === 400) {
        // 타인이 이미 수락한 경우
        Alert.alert('알림', (errorResponse.data as any).message);
        dispatch(orderSlice.actions.rejectOrder(item.orderId));
      }
    } finally {
      setLoading(true);
    }
    dispatch(orderSlice.actions.acceptOrder(item.orderId))
  }, [accessToken, navigation, dispatch, item.orderId]);

  const onReject = useCallback(() => {
    dispatch(orderSlice.actions.rejectOrder(item.orderId))
  }, [dispatch, item.orderId]);

  return (
    <View key={item.orderId} style={styles.orderContainer}>
      <Pressable onPress={toggleDetail} disabled={loading} style={styles.info}>
        <Text style={styles.eachInfo}>
          {item.price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}원
        </Text>
        <Text>삼성동</Text>
        <Text>왕십리동</Text>
      </Pressable>
      {detail ? (
        <View>
          <View>
            <Text>네이버맵이 들어갈 장소</Text>
          </View>
          <View style={styles.buttonWrapper}>
            <Pressable onPress={onAccept} style={styles.acceptButton}>
              <Text style={styles.buttonText}>수락</Text>
            </Pressable>
            <Pressable onPress={onReject} style={styles.rejectButton}>
              <Text style={styles.buttonText}>거절</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  orderContainer: {
    borderRadius: 5,
    margin: 5,
    padding: 10,
    backgroundColor: 'lightgray',
  },
  info: {
    flexDirection: 'row',
  },
  eachInfo: {
    flex: 1,
  },
  buttonWrapper: {
    flexDirection: 'row',
  },
  acceptButton: {
    backgroundColor: 'blue',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomLeftRadius: 5,
    borderTopLeftRadius: 5,
    flex: 1,
  },
  rejectButton: {
    backgroundColor: 'red',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomRightRadius: 5,
    borderTopRightRadius: 5,
    flex: 1,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default EachOrder;