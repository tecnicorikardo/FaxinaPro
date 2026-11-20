package com.faxinadroid.pro

import android.content.Intent
import android.os.Bundle
import android.text.format.Formatter
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DeleteSweep
import androidx.compose.material.icons.filled.FolderDelete
import androidx.compose.material.icons.filled.Layers
import androidx.compose.material.icons.filled.Security
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.faxinadroid.pro.engine.*
import com.faxinadroid.pro.permissions.AndroidPermissionsManager
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme(
                colorScheme = darkColorScheme(
                    primary = Color(0xFF10B981),
                    background = Color(0xFF0D1117),
                    surface = Color(0xFF161B22),
                    secondary = Color(0xFFF59E0B),
                    error = Color(0xFFE11D48)
                )
            ) {
                FaxinaDroidApp()
            }
        }
    }
}

@Composable
fun FaxinaDroidApp() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var selectedTab by remember { mutableIntStateOf(0) }
    var permStatus by remember { mutableStateOf(AndroidPermissionsManager.getStatus(context)) }
    var scannedApps by remember { mutableStateOf<List<ScannedAppInfo>>(emptyList()) }
    var scannedResidues by remember { mutableStateOf<List<ScannedResidue>>(emptyList()) }
    var selectedPackagesForUninstall by remember { mutableStateOf<Set<String>>(emptySet()) }
    var statusText by remember { mutableStateOf("Pronto para verificar o dispositivo") }
    var isBusy by remember { mutableStateOf(false) }

    val safLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        result.data?.data?.let { uri ->
            context.contentResolver.takePersistableUriPermission(
                uri,
                Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION
            )
        }
        permStatus = AndroidPermissionsManager.getStatus(context)
    }

    fun refreshScan() {
        scope.launch {
            isBusy = true
            permStatus = AndroidPermissionsManager.getStatus(context)
            statusText = "Analisando caches de aplicativos e resíduos..."
            scannedApps = AppCacheScanner.scanInstalledApps(context)
            scannedResidues = CorpseAndResidueScanner.scanAllResidues(context)
            statusText = "${scannedApps.size} apps e ${scannedResidues.size} resíduos analisados"
            isBusy = false
        }
    }

    LaunchedEffect(Unit) {
        refreshScan()
    }

    Scaffold(
        bottomBar = {
            NavigationBar(containerColor = Color(0xFF161B22)) {
                NavigationBarItem(
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 },
                    icon = { Icon(Icons.Default.Security, contentDescription = "Permissões") },
                    label = { Text("Permissões") }
                )
                NavigationBarItem(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 },
                    icon = { Icon(Icons.Default.Layers, contentDescription = "Cache") },
                    label = { Text("Cache") }
                )
                NavigationBarItem(
                    selected = selectedTab == 2,
                    onClick = { selectedTab = 2 },
                    icon = { Icon(Icons.Default.FolderDelete, contentDescription = "Resíduos") },
                    label = { Text("Resíduos") }
                )
                NavigationBarItem(
                    selected = selectedTab == 3,
                    onClick = { selectedTab = 3 },
                    icon = { Icon(Icons.Default.DeleteSweep, contentDescription = "Apps") },
                    label = { Text("Apps") }
                )
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
        ) {
            Text(
                text = "FaxinaDroid Pro",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = statusText,
                style = MaterialTheme.typography.bodySmall,
                color = Color(0xFF94A3B8)
            )
            Spacer(modifier = Modifier.height(12.dp))

            when (selectedTab) {
                0 -> {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        PermissionCard(
                            title = "Acesso a Todos os Arquivos (MANAGE_EXTERNAL_STORAGE)",
                            granted = permStatus.allFilesAccess,
                            onGrant = {
                                context.startActivity(AndroidPermissionsManager.createAllFilesAccessIntent(context))
                            }
                        )
                        PermissionCard(
                            title = "Acesso de Uso e Cache (PACKAGE_USAGE_STATS)",
                            granted = permStatus.usageStatsAccess,
                            onGrant = {
                                context.startActivity(AndroidPermissionsManager.createUsageAccessIntent())
                            }
                        )
                        PermissionCard(
                            title = "Serviço de Acessibilidade (Limpeza & Desinstalação Automática)",
                            granted = permStatus.accessibilityEnabled,
                            onGrant = {
                                context.startActivity(AndroidPermissionsManager.createAccessibilitySettingsIntent())
                            }
                        )
                        PermissionCard(
                            title = "Acesso SAF à pasta /Android/data (CorpseFinder)",
                            granted = permStatus.androidDataSafGranted,
                            onGrant = {
                                safLauncher.launch(AndroidPermissionsManager.createAndroidDataSafIntent())
                            }
                        )
                        Button(
                            onClick = { refreshScan() },
                            enabled = !isBusy,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("Atualizar Permissões e Escanear")
                        }
                    }
                }

                1 -> {
                    val cacheTargets = scannedApps.filter { it.cacheBytes > 0L }
                    Button(
                        onClick = {
                            scope.launch {
                                isBusy = true
                                MassUninstallerEngine.runAutomatedCacheClean(
                                    context,
                                    cacheTargets.map { it.packageName }
                                ) { idx, pkg ->
                                    statusText = "Limpando cache (${idx + 1}/${cacheTargets.size}): $pkg"
                                }
                                refreshScan()
                            }
                        },
                        enabled = !isBusy && cacheTargets.isNotEmpty() && permStatus.accessibilityEnabled,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Limpar Cache Automaticamente (${cacheTargets.size} apps)")
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(cacheTargets, key = { it.packageName }) { app ->
                            Card {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(12.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(app.appName, fontWeight = FontWeight.SemiBold)
                                        Text(app.packageName, style = MaterialTheme.typography.bodySmall)
                                    }
                                    Text(
                                        text = Formatter.formatFileSize(context, app.cacheBytes),
                                        color = Color(0xFF10B981),
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                        }
                    }
                }

                2 -> {
                    Button(
                        onClick = {
                            scope.launch {
                                isBusy = true
                                scannedResidues.forEach { CorpseAndResidueScanner.deleteResidue(it) }
                                refreshScan()
                            }
                        },
                        enabled = !isBusy && scannedResidues.isNotEmpty(),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Remover Todos os Resíduos (${scannedResidues.size})")
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(scannedResidues, key = { it.id }) { res ->
                            Card {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(12.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(res.title, fontWeight = FontWeight.SemiBold)
                                        Text(res.path, style = MaterialTheme.typography.bodySmall)
                                    }
                                    Text(
                                        text = Formatter.formatFileSize(context, res.sizeBytes),
                                        color = Color(0xFFF59E0B),
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                        }
                    }
                }

                3 -> {
                    val userApps = scannedApps.filter { !it.isSystemApp }
                    Button(
                        onClick = {
                            scope.launch {
                                isBusy = true
                                val list = selectedPackagesForUninstall.toList()
                                MassUninstallerEngine.runAutomatedMassUninstall(
                                    context,
                                    list,
                                    cleanCorpseAfterEach = true
                                ) { idx, pkg ->
                                    statusText = "Desinstalando (${idx + 1}/${list.size}): $pkg"
                                }
                                selectedPackagesForUninstall = emptySet()
                                refreshScan()
                            }
                        },
                        enabled = !isBusy && selectedPackagesForUninstall.isNotEmpty(),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Desinstalar em Massa (${selectedPackagesForUninstall.size})")
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(userApps, key = { it.packageName }) { app ->
                            val checked = selectedPackagesForUninstall.contains(app.packageName)
                            Card {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(12.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Checkbox(
                                        checked = checked,
                                        onCheckedChange = { isChecked ->
                                            selectedPackagesForUninstall = if (isChecked) {
                                                selectedPackagesForUninstall + app.packageName
                                            } else {
                                                selectedPackagesForUninstall - app.packageName
                                            }
                                        }
                                    )
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(app.appName, fontWeight = FontWeight.SemiBold)
                                        Text(
                                            "${Formatter.formatFileSize(context, app.totalBytes)} · ${app.daysSinceLastUse}d sem uso",
                                            style = MaterialTheme.typography.bodySmall
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun PermissionCard(
    title: String,
    granted: Boolean,
    onGrant: () -> Unit
) {
    Card {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f).padding(end = 8.dp)) {
                Text(title, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                Text(
                    text = if (granted) "Concedida" else "Necessária para limpeza real",
                    style = MaterialTheme.typography.bodySmall,
                    color = if (granted) Color(0xFF10B981) else Color(0xFFF59E0B)
                )
            }
            if (!granted) {
                OutlinedButton(onClick = onGrant) {
                    Text("Conceder")
                }
            }
        }
    }
}
