package com.runflow.app.data.cache

import com.runflow.app.data.local.CacheMetadataDao
import com.runflow.app.data.local.entity.CacheMetadataEntity
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Central cache orchestrator managing TTL and staleness for all cache types.
 * Provides methods to check cache validity and invalidate caches.
 */
@Singleton
class CacheManager @Inject constructor(
    private val cacheMetadataDao: CacheMetadataDao,
    private val networkMonitor: NetworkMonitor
) {
    /**
     * Check if the cache for a given type is still valid (not expired).
     */
    suspend fun isCacheValid(cacheType: CacheType): Boolean {
        val metadata = cacheMetadataDao.getCacheMetadata(cacheType.name) ?: return false
        if (metadata.isStale) return false
        
        val age = System.currentTimeMillis() - metadata.lastUpdatedAt
        return age < cacheType.ttlMs
    }

    /**
     * Get the age of the cache in milliseconds, or null if no cache exists.
     */
    suspend fun getCacheAge(cacheType: CacheType): Long? {
        val metadata = cacheMetadataDao.getCacheMetadata(cacheType.name) ?: return null
        return System.currentTimeMillis() - metadata.lastUpdatedAt
    }

    /**
     * Mark cache as updated now.
     */
    suspend fun markCacheUpdated(cacheType: CacheType) {
        cacheMetadataDao.insert(
            CacheMetadataEntity(
                cacheType = cacheType.name,
                lastUpdatedAt = System.currentTimeMillis(),
                isStale = false
            )
        )
    }

    /**
     * Invalidate a specific cache type, forcing refresh on next access.
     */
    suspend fun invalidateCache(cacheType: CacheType) {
        cacheMetadataDao.markAsStale(cacheType.name)
    }

    /**
     * Invalidate ALL caches. Used when refresh button is pressed.
     */
    suspend fun invalidateAllCaches() {
        cacheMetadataDao.markAllAsStale()
    }

    /**
     * Check if network is currently available.
     */
    fun isOnline(): Boolean = networkMonitor.isCurrentlyOnline()

    /**
     * Determine if we should fetch from network.
     * Returns true if:
     * - We're online AND cache is invalid/expired
     * - We're online AND forceRefresh is true
     */
    suspend fun shouldFetchFromNetwork(cacheType: CacheType, forceRefresh: Boolean = false): Boolean {
        if (!isOnline()) return false
        if (forceRefresh) return true
        return !isCacheValid(cacheType)
    }
}
