package com.faxinadroid.pro.engine

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import com.faxinadroid.pro.service.CleanerAccessibilityService
import kotlinx.coroutines.delay

object MassUninstallerEngine {

    /**
     * Executa a fila automática de limpeza de cache app por app usando o AccessibilityService,
     * exatamente no padrão do SD Maid Pro.
     */
    suspend fun runAutomatedCacheClean(
        context: Context,
        packageNames: List<String>,
        onProgress: (index: Int, packageName: String) -> Unit
    ) {
        CleanerAccessibilityService.currentMode = CleanerAccessibilityService.AutomationMode.CLEAR_CACHE
        try {
            packageNames.forEachIndexed { index, pkg ->
                onProgress(index, pkg)
                val intent = Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                    data = Uri.parse("package:$pkg")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                }
                context.startActivity(intent)
                // Aguarda o CleanerAccessibilityService navegar até "Armazenamento" -> "Limpar cache"
                delay(2200L)
            }
        } finally {
            CleanerAccessibilityService.currentMode = CleanerAccessibilityService.AutomationMode.IDLE
        }
    }

    /**
     * Executa a fila automática de desinstalação em massa de aplicativos.
     * Quando o CleanerAccessibilityService está ativo, confirma automaticamente o diálogo do PackageInstaller.
     */
    suspend fun runAutomatedMassUninstall(
        context: Context,
        packageNames: List<String>,
        cleanCorpseAfterEach: Boolean,
        onProgress: (index: Int, packageName: String) -> Unit
    ) {
        CleanerAccessibilityService.currentMode = CleanerAccessibilityService.AutomationMode.UNINSTALL_APP
        try {
            packageNames.forEachIndexed { index, pkg ->
                onProgress(index, pkg)
                val intent = Intent(Intent.ACTION_DELETE, Uri.parse("package:$pkg")).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)

                // Aguarda até o pacote ser removido do PackageManager (ou timeout de 5s)
                var waited = 0L
                while (isPackageInstalled(context, pkg) && waited < 5000L) {
                    delay(300L)
                    waited += 300L
                }

                if (cleanCorpseAfterEach && !isPackageInstalled(context, pkg)) {
                    val residues = CorpseAndResidueScanner.scanAllResidues(context)
                        .filter { it.path.contains(pkg) }
                    residues.forEach { CorpseAndResidueScanner.deleteResidue(it) }
                }
            }
        } finally {
            CleanerAccessibilityService.currentMode = CleanerAccessibilityService.AutomationMode.IDLE
        }
    }

    private fun isPackageInstalled(context: Context, packageName: String): Boolean {
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                context.packageManager.getPackageInfo(packageName, PackageManager.PackageInfoFlags.of(0))
            } else {
                @Suppress("DEPRECATION")
                context.packageManager.getPackageInfo(packageName, 0)
            }
            true
        } catch (_: PackageManager.NameNotFoundException) {
            false
        }
    }
}
