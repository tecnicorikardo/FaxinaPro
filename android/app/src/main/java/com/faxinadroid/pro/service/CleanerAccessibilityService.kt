package com.faxinadroid.pro.service

import android.accessibilityservice.AccessibilityService
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

/**
 * Serviço de Acessibilidade nativo (mesma técnica do SD Maid Pro para aparelhos sem Root).
 * Atua apenas quando explicitamente disparado pela fila de limpeza ou desinstalação em massa.
 */
class CleanerAccessibilityService : AccessibilityService() {

    enum class AutomationMode {
        IDLE,
        CLEAR_CACHE,
        UNINSTALL_APP
    }

    companion object {
        @Volatile
        var currentMode: AutomationMode = AutomationMode.IDLE
    }

    private var lastClickTime = 0L

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (currentMode == AutomationMode.IDLE) return
        val root = rootInActiveWindow ?: return

        val now = System.currentTimeMillis()
        if (now - lastClickTime < 350L) return

        when (currentMode) {
            AutomationMode.CLEAR_CACHE -> handleClearCacheScreen(root)
            AutomationMode.UNINSTALL_APP -> handleUninstallDialog(root)
            AutomationMode.IDLE -> Unit
        }
    }

    private fun handleClearCacheScreen(root: AccessibilityNodeInfo) {
        // 1. Tenta clicar em "Limpar cache" / "Clear cache" se já estiver na tela de Armazenamento
        val clearCacheLabels = listOf("Limpar cache", "Clear cache", "Esvaziar cache")
        for (label in clearCacheLabels) {
            val nodes = root.findAccessibilityNodeInfosByText(label)
            for (node in nodes) {
                if (clickClickableParent(node)) {
                    lastClickTime = System.currentTimeMillis()
                    return
                }
            }
        }

        // 2. Caso esteja na tela principal de Informações do App, abre "Armazenamento e cache"
        val storageLabels = listOf("Armazenamento e cache", "Armazenamento", "Storage & cache", "Storage")
        for (label in storageLabels) {
            val nodes = root.findAccessibilityNodeInfosByText(label)
            for (node in nodes) {
                if (clickClickableParent(node)) {
                    lastClickTime = System.currentTimeMillis()
                    return
                }
            }
        }
    }

    private fun handleUninstallDialog(root: AccessibilityNodeInfo) {
        val confirmLabels = listOf("OK", "Desinstalar", "Uninstall", "Confirmar")
        for (label in confirmLabels) {
            val nodes = root.findAccessibilityNodeInfosByText(label)
            for (node in nodes) {
                if (clickClickableParent(node)) {
                    lastClickTime = System.currentTimeMillis()
                    return
                }
            }
        }
    }

    private fun clickClickableParent(node: AccessibilityNodeInfo?): Boolean {
        var current = node
        while (current != null) {
            if (current.isClickable && current.isEnabled) {
                return current.performAction(AccessibilityNodeInfo.ACTION_CLICK)
            }
            current = current.parent
        }
        return false
    }

    override fun onInterrupt() {
        currentMode = AutomationMode.IDLE
    }
}
