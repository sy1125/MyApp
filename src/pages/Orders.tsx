import React from "react";
import { Text, View } from "react-native";
import { useSelector } from "react-redux";
import { RootState } from "../store/reducer";

function Order() {
  const orders = useSelector((state: RootState) => state.order.orders);
  return (
    <View>
      {orders.map(v => (
        <View>
          <Text>{v.orderId}</Text>
        </View>
      ))}
    </View>
  )
}


export default Order;