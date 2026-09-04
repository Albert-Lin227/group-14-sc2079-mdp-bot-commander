package com.botcommander2

// BluetoothService.kt


import android.Manifest
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothSocket
import android.content.Context
import android.content.pm.PackageManager
import androidx.annotation.RequiresPermission
import androidx.core.app.ActivityCompat
import kotlinx.coroutines.*
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStream
import java.util.UUID

class BluetoothService(
    private val context: Context,
    private val onMessage: (String) -> Unit,
    private val onStatus: (String) -> Unit
) {
    private val adapter = BluetoothAdapter.getDefaultAdapter()
    private var socket: BluetoothSocket? = null
    private var output: OutputStream? = null
    private var reader: BufferedReader? = null
    private var readJob: Job? = null
    private var reconnectJob: Job? = null
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    private var lastDeviceAddress: String? = null
    private var autoReconnect = false

    private val sppUuid: UUID =
        UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")

    @RequiresPermission(Manifest.permission.BLUETOOTH_CONNECT)
    fun pairedDevices(): List<BluetoothDevice> =
        adapter?.bondedDevices?.toList() ?: emptyList()

    fun connect(deviceAddress: String) {
        lastDeviceAddress = deviceAddress
        autoReconnect = true
        reconnectJob?.cancel()
        doConnect(deviceAddress)
    }

    private fun doConnect(deviceAddress: String) {
        scope.launch {
            try {
                if (socket?.isConnected == true) return@launch

                val device = adapter.getRemoteDevice(deviceAddress)
                if (ActivityCompat.checkSelfPermission(
                        context,
                        Manifest.permission.BLUETOOTH_SCAN
                    ) != PackageManager.PERMISSION_GRANTED &&
                    android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S
                ) {
                    // Permissions should be handled at the React Native layer
                }
                adapter.cancelDiscovery()

                onStatus("Connecting to ${device.name ?: device.address}...")
                socket = device.createRfcommSocketToServiceRecord(sppUuid)
                socket?.connect()

                val inputStream = socket?.inputStream
                output = socket?.outputStream
                reader = inputStream?.let { BufferedReader(InputStreamReader(it)) }

                onStatus("Connected to ${device.name ?: device.address}")
                startReading()
            } catch (e: Exception) {
                onStatus("Connection failed: ${e.message}")
                if (autoReconnect) {
                    scheduleReconnect()
                } else {
                    cleanup()
                }
            }
        }
    }

    private fun scheduleReconnect() {
        reconnectJob?.cancel()
        reconnectJob = scope.launch {
            delay(3000)
            lastDeviceAddress?.let {
                onStatus("Attempting to reconnect...")
                doConnect(it)
            }
        }
    }

    fun send(text: String) {
        scope.launch {
            try {
                val payload = if (text.endsWith("\n")) text else "$text\n"
                output?.write(payload.toByteArray())
                output?.flush()
            } catch (e: Exception) {
                onStatus("Send failed: ${e.message}")
            }
        }
    }

    private fun startReading() {
        readJob?.cancel()
        readJob = scope.launch {
            while (isActive && socket?.isConnected == true) {
                try {
                    val line = reader?.readLine() ?: break
                    if (line.isNotEmpty()) {
                        onMessage(line)
                    }
                } catch (e: Exception) {
                    onStatus("Connection lost: ${e.message}")
                    break
                }
            }
            if (autoReconnect) scheduleReconnect()
            else cleanup()
        }
    }

    fun disconnect() {
        autoReconnect = false
        reconnectJob?.cancel()
        cleanup()
        onStatus("Disconnected")
    }

    private fun cleanup() {
        readJob?.cancel()
        try { reader?.close() } catch (_: Exception) {}
        try { output?.close() } catch (_: Exception) {}
        try { socket?.close() } catch (_: Exception) {}

        socket = null
        reader = null
        output = null
    }
}
