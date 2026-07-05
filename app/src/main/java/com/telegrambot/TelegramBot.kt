package com.telegrambot

import kotlinx.coroutines.*
import kotlinx.coroutines.Dispatchers.IO
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class TelegramBot(
    private val token: String,
    private val onMessage: (chatId: Long, text: String, messageId: Int) -> Unit
) {
    private val client = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()

    private val apiUrl = "https://api.telegram.org/bot$token"
    private var lastUpdateId = 0
    private var isRunning = false
    private var job: Job? = null

    private val jsonMediaType = "application/json; charset=utf-8".toMediaType()

    fun start(scope: CoroutineScope) {
        if (isRunning) return
        isRunning = true
        job = scope.launch(IO) {
            while (isRunning) {
                try {
                    getUpdates()
                } catch (e: Exception) {
                    delay(3000)
                }
            }
        }
    }

    fun stop() {
        isRunning = false
        job?.cancel()
    }

    private fun getUpdates() {
        val json = JSONObject().apply {
            put("offset", lastUpdateId)
            put("timeout", 30)
        }

        val request = Request.Builder()
            .url("$apiUrl/getUpdates")
            .post(json.toString().toRequestBody(jsonMediaType))
            .build()

        val response = client.newCall(request).execute()
        val body = response.body?.string()

        if (body != null) {
            val result = JSONObject(body).getJSONArray("result")
            for (i in 0 until result.length()) {
                val update = result.getJSONObject(i)
                val updateId = update.getInt("update_id")
                if (updateId >= lastUpdateId) {
                    lastUpdateId = updateId + 1
                }
                if (update.has("message")) {
                    val message = update.getJSONObject("message")
                    val chatId = message.getJSONObject("chat").getLong("id")
                    val text = message.optString("text", "")
                    val messageId = message.getInt("message_id")
                    onMessage(chatId, text, messageId)
                }
            }
        }
    }

    fun sendMessage(chatId: Long, text: String) {
        val json = JSONObject().apply {
            put("chat_id", chatId)
            put("text", text)
            put("parse_mode", "HTML")
        }

        val request = Request.Builder()
            .url("$apiUrl/sendMessage")
            .post(json.toString().toRequestBody(jsonMediaType))
            .build()

        client.newCall(request).execute()
    }

    fun sendMessageWithReply(chatId: Long, text: String, replyToMessageId: Int) {
        val json = JSONObject().apply {
            put("chat_id", chatId)
            put("text", text)
            put("parse_mode", "HTML")
            put("reply_to_message_id", replyToMessageId)
        }

        val request = Request.Builder()
            .url("$apiUrl/sendMessage")
            .post(json.toString().toRequestBody(jsonMediaType))
            .build()

        client.newCall(request).execute()
    }

    fun sendSticker(chatId: Long, stickerId: String) {
        val json = JSONObject().apply {
            put("chat_id", chatId)
            put("sticker", stickerId)
        }

        val request = Request.Builder()
            .url("$apiUrl/sendSticker")
            .post(json.toString().toRequestBody(jsonMediaType))
            .build()

        client.newCall(request).execute()
    }
}
