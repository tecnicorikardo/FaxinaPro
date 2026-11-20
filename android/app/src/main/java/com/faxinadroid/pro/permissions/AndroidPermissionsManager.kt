package com.faxinadroid.pro.permissions

import android.app.AppOpsManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.os.Process
import android.provider.DocumentsContract
import android.provider.Settings
import android.text.TextUtils
import com.faxinadroid.pro.service.CleanerAccessibilityService

data class PermissionStatus(
    val allFilesAccess: Boolean,
    val usageStatsAccess: Boolean,
    val accessibilityEnabled: Boolean,
    val androidDataSafGranted: Boolean
) {
    val allCoreGranted: Boolean
        get() = allFilesAccess && usageStatsAccess && accessibilityEnabled
}

object AndroidPermissionsManager {

    fun getStatus(context: Context): PermissionStatus {
        return PermissionStatus(
            allFilesAccess = hasAllFilesAccess(),
            usageStatsAccess = hasUsageStatsPermission(context),
            accessibilityEnabled = isAccessibilityServiceEnabled(context),
            androidDataSafGranted = hasAndroidDataSafPermission(context)
        )
    }

    fun hasAllFilesAccess(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Environment.isExternalStorageManager()
        } else {
            true
        }
    }

    fun hasUsageStatsPermission(context: Context): Boolean {
        val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            appOps.unsafeCheckOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                Process.myUid(),
                context.packageName
            )
        } else {
            @Suppress("DEPRECATION")
            appOps.checkOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                Process.myUid(),
                context.packageName
            )
        }
        return mode == AppOpsManager.MODE_ALLOWED
    }

    fun isAccessibilityServiceEnabled(context: Context): Boolean {
        val expected = ComponentName(context, CleanerAccessibilityService::class.java).flattenToString()
        val enabledServices = Settings.Secure.getString(
            context.contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        ) ?: return false

        val splitter = TextUtils.SimpleStringSplitter(':')
        splitter.setString(enabledServices)
        while (splitter.hasNext()) {
            val component = splitter.next()
            if (component.equals(expected, ignoreCase = true)) {
                return true
            }
        }
        return false
    }

    fun hasAndroidDataSafPermission(context: Context): Boolean {
        return context.contentResolver.persistedUriPermissions.any { perm ->
            perm.isWritePermission && perm.uri.toString().contains("Android%2Fdata")
        }
    }

    fun createAllFilesAccessIntent(context: Context): Intent {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Intent(
                Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION,
                Uri.parse("package:${context.packageName}")
            )
        } else {
            Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${context.packageName}"))
        }
    }

    fun createUsageAccessIntent(): Intent {
        return Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
    }

    fun createAccessibilitySettingsIntent(): Intent {
        return Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
    }

    fun createAndroidDataSafIntent(): Intent {
        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT_TREE)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val initialUri = DocumentsContract.buildDocumentUri(
                "com.android.externalstorage.documents",
                "primary:Android/data"
            )
            intent.putExtra(DocumentsContract.EXTRA_INITIAL_URI, initialUri)
        }
        intent.addFlags(
            Intent.FLAG_GRANT_READ_URI_PERMISSION or
                Intent.FLAG_GRANT_WRITE_URI_PERMISSION or
                Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION
        )
        return intent
    }
}
