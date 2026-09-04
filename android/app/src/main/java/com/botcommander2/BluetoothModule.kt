package com.botcommander2

// BluetoothModule.kt


import android.Manifest
import androidx.annotation.RequiresPermission
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class BluetoothModule(context: ReactApplicationContext) :
    ReactContextBaseJavaModule(context) {

    private val service = BluetoothService(
        context,
        onMessage = { emit("robotMessage", it) },
        onStatus = { emit("bluetoothStatus", it) }
    )

    override fun getName() = "RobotBluetooth"

    @RequiresPermission(Manifest.permission.BLUETOOTH_CONNECT)
    @ReactMethod
    fun getPairedDevices(promise: Promise) {
        val devices = Arguments.createArray()

        service.pairedDevices().forEach { device ->
            val item = Arguments.createMap()
            item.putString("name", device.name ?: "Unknown device")
            item.putString("address", device.address)
            devices.pushMap(item)
        }

        promise.resolve(devices)
    }

    @ReactMethod
    fun connect(address: String) = service.connect(address)

    @ReactMethod
    fun send(message: String) = service.send(message)

    @ReactMethod
    fun disconnect() = service.disconnect()

    private fun emit(event: String, value: String) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(event, value)
    }
}