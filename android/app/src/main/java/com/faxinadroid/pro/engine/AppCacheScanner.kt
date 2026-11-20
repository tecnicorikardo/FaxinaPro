package com.faxinadroid.pro.engine

import android.app.usage.StorageStatsManager
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.os.Build
import android.os.storage.StorageManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.concurrent.TimeUnit

data class ScannedAppInfo(
    val packageName: String,
    val appName: String,
    val appBytes: Long,
    val dataBytes: Long,
    val cacheBytes: Long,
    val daysSinceLastUse: Int,
    val isSystemApp: Boolean
) {
    val totalBytes: Long get() = appBytes + dataBytes + cacheBytes
}

object AppCacheScanner {

    suspend fun scanInstalledApps(context: Context): List<ScannedAppInfo> = withContext(Dispatchers.IO) {
        val pm = context.packageManager
        val storageStatsManager = context.getSystemService(Context.STORAGE_STATS_SERVICE) as StorageStatsManager
        val usageStatsManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager

        val now = System.currentTimeMillis()
        val oneYearAgo = now - TimeUnit.DAYS.toMillis(365)
        val usageMap = usageStatsManager.queryAndAggregateUsageStats(oneYearAgo, now)

        val packages = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            pm.getInstalledApplications(PackageManager.ApplicationInfoFlags.of(0))
        } else {
            @Suppress("DEPRECATION")
            pm.getInstalledApplications(0)
        }

        val results = mutableListOf<ScannedAppInfo>()

        for (appInfo in packages) {
            if (appInfo.packageName == context.packageName) continue
            val isSystem = (appInfo.flags and ApplicationInfo.FLAG_SYSTEM) != 0
            val label = pm.getApplicationLabel(appInfo).toString()

            var appBytes = 0L
            var dataBytes = 0L
            var cacheBytes = 0L

            try {
                val uuid = appInfo.storageUuid
                val stats = storageStatsManager.queryStatsForPackage(
                    uuid,
                    appInfo.packageName,
                    android.os.Process.myUserHandle()
                )
                appBytes = stats.appBytes
                dataBytes = stats.dataBytes
                cacheBytes = stats.cacheBytes
            } catch (_: Exception) {
                // Requer PACKAGE_USAGE_STATS concedido pelo usuário nas Configurações
            }

            val lastUsedMs = usageMap[appInfo.packageName]?.lastTimeUsed ?: 0L
            val daysUnused = if (lastUsedMs > 0L) {
                TimeUnit.MILLISECONDS.toDays((now - lastUsedMs).coerceAtLeast(0L)).toInt()
            } else {
                999
            }

            results.add(
                ScannedAppInfo(
                    packageName = appInfo.packageName,
                    appName = label,
                    appBytes = appBytes,
                    dataBytes = dataBytes,
                    cacheBytes = cacheBytes,
                    daysSinceLastUse = daysUnused,
                    isSystemApp = isSystem
                )
            )
        }

        results.sortedByDescending { it.cacheBytes }
    }
}
