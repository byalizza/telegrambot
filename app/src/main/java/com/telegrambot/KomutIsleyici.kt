package com.telegrambot

object KomutIsleyici {

    private val kullanicilar = mutableMapOf<Long, String>()

    fun isle(text: String, chatId: Long, messageId: Int, bot: TelegramBot) {
        if (!text.startsWith("/")) return

        val komut = text.split(" ").first().lowercase()

        when (komut) {
            "/start" -> {
                val mesaj = """
                    Merhaba! Ben bir Telegram botuyum.
                    
                    Kullanılabilir komutlar:
                    /merhaba - Selamlaşır
                    /yardim - Yardım menüsü
                    /saat - Şu anki saati gösterir
                    /yazı <mesaj> - Mesajınızı tekrarlar
                    /stickers - Çıkartma gönderir
                """.trimIndent()
                bot.sendMessage(chatId, mesaj)
            }

            "/merhaba" -> {
                bot.sendMessage(chatId, "Merhaba! 👋 Nasılsın?")
            }

            "/yardim" -> {
                val yardim = """
                    📋 <b>Kullanılabilir Komutlar:</b>
                    
                    /merhaba - Selamlaşır
                    /saat - Şu anki saati gösterir
                    /yazı <mesaj> - Yazdığınız mesajı tekrarlar
                    /stickers - Çıkartma gönderir
                    /yardim - Bu menüyü gösterir
                """.trimIndent()
                bot.sendMessage(chatId, yardim)
            }

            "/saat" -> {
                val zaman = java.text.SimpleDateFormat(
                    "dd MMMM yyyy HH:mm:ss",
                    java.util.Locale("tr")
                ).format(java.util.Date())
                bot.sendMessage(chatId, "🕐 Şu anki saat: <b>$zaman</b>")
            }

            "/yazı" -> {
                val mesaj = text.removePrefix("/yazı").trim()
                if (mesaj.isEmpty()) {
                    bot.sendMessage(chatId, "Bir mesaj yazmalısın. Örn: /yazı Merhaba dünya!")
                } else {
                    bot.sendMessageWithReply(chatId, "✍️ <i>$mesaj</i>", messageId)
                }
            }

            "/stickers" -> {
                val stickerId = "CAACAgIAAxkBAAEBFQJl8..."
                bot.sendSticker(chatId, stickerId)
            }

            else -> {
                bot.sendMessage(chatId, "❌ Bilinmeyen komut: $komut\n/yardim yazarak komutları görebilirsin.")
            }
        }
    }
}
