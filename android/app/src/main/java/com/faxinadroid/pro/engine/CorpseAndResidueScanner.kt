package com.faxinadroid.pro.engine

import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.Environment
import androidx.documentfile.provider.DocumentFile
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File

enum class ResidueCategory {
    CADAVER,
    TEMPORARIO_LOG,
    APK_OBSOLETO,
    MINIATURA,
    PASTA_VAZIA
}

data class ScannedResidue(
    val id: String,
    val title: String,
    val path: String,
    val category: ResidueCategory,
    val sizeBytes: Long,
    val fileCount: Int,
    val fileRef: File? = null,
    val docRef: DocumentFile? = null
)

object CorpseAndResidueScanner {

    suspend fun scanAllResidues(context: Context): List<ScannedResidue> = withContext(Dispatchers.IO) {
        val found = mutableListOf<ScannedResidue>()
        val installedPackages = getInstalledPackageSet(context)
        val root = Environment.getExternalStorageDirectory()

        // 1. CorpseFinder via armazenamento direto (para pastas em Android/obb ou Android/data acessíveis)
        val obbDir = File(root, "Android/obb")
        if (obbDir.exists() && obbDir.isDirectory) {
            obbDir.listFiles()?.forEach { child ->
                if (child.isDirectory && !installedPackages.contains(child.name)) {
                    val (bytes, count) = measureDirectory(child)
                    if (bytes > 0L || count > 0) {
                        found.add(
                            ScannedResidue(
                                id = "corpse-obb-${child.name}",
                                title = "Sobras OBB: ${child.name}",
                                path = child.absolutePath,
                                category = ResidueCategory.CADAVER,
                                sizeBytes = bytes,
                                fileCount = count,
                                fileRef = child
                            )
                        )
                    }
                }
            }
        }

        // 2. CorpseFinder via SAF (/Android/data) no Android 11+
        context.contentResolver.persistedUriPermissions
            .firstOrNull { it.isWritePermission && it.uri.toString().contains("Android%2Fdata") }
            ?.let { perm ->
                val dataTree = DocumentFile.fromTreeUri(context, perm.uri)
                dataTree?.listFiles()?.forEach { child ->
                    val pkg = child.name ?: return@forEach
                    if (child.isDirectory && pkg.contains(".") && !installedPackages.contains(pkg)) {
                        val size = measureDocumentTree(child)
                        found.add(
                            ScannedResidue(
                                id = "corpse-saf-$pkg",
                                title = "Pasta órfã: $pkg",
                                path = "/Android/data/$pkg",
                                category = ResidueCategory.CADAVER,
                                sizeBytes = size,
                                fileCount = 1,
                                docRef = child
                            )
                        )
                    }
                }
            }

        // 3. SystemCleaner: .thumbnails, .tmp, .log, .bak, APKs já instalados e pastas vazias
        val thumbDir = File(root, "DCIM/.thumbnails")
        if (thumbDir.exists()) {
            val (bytes, count) = measureDirectory(thumbDir)
            if (bytes > 0L) {
                found.add(
                    ScannedResidue(
                        id = "sys-thumbs",
                        title = "Cache de miniaturas (.thumbnails)",
                        path = thumbDir.absolutePath,
                        category = ResidueCategory.MINIATURA,
                        sizeBytes = bytes,
                        fileCount = count,
                        fileRef = thumbDir
                    )
                )
            }
        }

        walkForJunk(root, installedPackages, context.packageManager, found, depth = 0)
        found.sortedByDescending { it.sizeBytes }
    }

    suspend fun deleteResidue(item: ScannedResidue): Boolean = withContext(Dispatchers.IO) {
        try {
            item.docRef?.let { return@withContext it.delete() }
            item.fileRef?.let { return@withContext it.deleteRecursively() }
            false
        } catch (_: Exception) {
            false
        }
    }

    private fun walkForJunk(
        dir: File,
        installedPackages: Set<String>,
        pm: PackageManager,
        out: MutableList<ScannedResidue>,
        depth: Int
    ) {
        if (depth > 4 || !dir.exists() || !dir.isDirectory) return
        val name = dir.name
        if (name == "Android" && depth == 1) return // Já tratado no CorpseFinder

        val children = dir.listFiles() ?: return
        if (children.isEmpty() && depth > 0) {
            out.add(
                ScannedResidue(
                    id = "empty-${dir.absolutePath.hashCode()}",
                    title = "Pasta vazia: ${dir.name}",
                    path = dir.absolutePath,
                    category = ResidueCategory.PASTA_VAZIA,
                    sizeBytes = 0L,
                    fileCount = 1,
                    fileRef = dir
                )
            )
            return
        }

        for (child in children) {
            if (child.isDirectory) {
                walkForJunk(child, installedPackages, pm, out, depth + 1)
            } else {
                val lower = child.name.lowercase()
                when {
                    lower.endsWith(".tmp") || lower.endsWith(".log") || lower.endsWith(".bak") -> {
                        out.add(
                            ScannedResidue(
                                id = "junk-${child.absolutePath.hashCode()}",
                                title = child.name,
                                path = child.absolutePath,
                                category = ResidueCategory.TEMPORARIO_LOG,
                                sizeBytes = child.length(),
                                fileCount = 1,
                                fileRef = child
                            )
                        )
                    }
                    lower.endsWith(".apk") -> {
                        val pkgInfo = pm.getPackageArchiveInfo(child.absolutePath, 0)
                        if (pkgInfo != null && installedPackages.contains(pkgInfo.packageName)) {
                            out.add(
                                ScannedResidue(
                                    id = "apk-${child.absolutePath.hashCode()}",
                                    title = "APK já instalado: ${child.name}",
                                    path = child.absolutePath,
                                    category = ResidueCategory.APK_OBSOLETO,
                                    sizeBytes = child.length(),
                                    fileCount = 1,
                                    fileRef = child
                                )
                            )
                        }
                    }
                }
            }
        }
    }

    private fun getInstalledPackageSet(context: Context): Set<String> {
        val pm = context.packageManager
        val list = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            pm.getInstalledApplications(PackageManager.ApplicationInfoFlags.of(0))
        } else {
            @Suppress("DEPRECATION")
            pm.getInstalledApplications(0)
        }
        return list.map { it.packageName }.toSet()
    }

    private fun measureDirectory(dir: File): Pair<Long, Int> {
        var bytes = 0L
        var count = 0
        dir.walkTopDown().forEach { f ->
            if (f.isFile) {
                bytes += f.length()
                count++
            }
        }
        return bytes to count
    }

    private fun measureDocumentTree(doc: DocumentFile): Long {
        var bytes = 0L
        doc.listFiles().forEach { child ->
            bytes += if (child.isDirectory) measureDocumentTree(child) else child.length()
        }
        return bytes
    }
}
