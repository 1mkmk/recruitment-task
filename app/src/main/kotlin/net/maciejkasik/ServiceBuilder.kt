package net.maciejkasik

import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

/**
 * Builder class for creating API service instances with environment-specific configuration
 */
object ServiceBuilder {
    private val config = ConfigProvider.getConfig()
    
    private val httpClient = OkHttpClient.Builder().apply {
        // Dodaj timeout z konfiguracji
        connectTimeout(config.requestTimeout, TimeUnit.SECONDS)
        readTimeout(config.requestTimeout, TimeUnit.SECONDS)
        writeTimeout(config.requestTimeout, TimeUnit.SECONDS)
        
        // Dodaj logger dla środowisk development i staging
        if (config.loggingEnabled) {
            val loggingInterceptor = HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            }
            addInterceptor(loggingInterceptor)
        }
    }.build()
    
    private val retrofit = Retrofit.Builder()
        .baseUrl(config.apiBaseUrl)
        .client(httpClient)
        .addConverterFactory(GsonConverterFactory.create())
        .build()
    
    fun <T> buildService(service: Class<T>): T {
        return retrofit.create(service)
    }
} 