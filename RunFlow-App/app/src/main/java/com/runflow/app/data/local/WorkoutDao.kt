package com.runflow.app.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.runflow.app.data.local.entity.WorkoutEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface WorkoutDao {
    @Query("SELECT * FROM workouts ORDER BY scheduledDate ASC")
    fun getAllWorkouts(): Flow<List<WorkoutEntity>>

    @Query("SELECT * FROM workouts WHERE goalId = :goalId ORDER BY scheduledDate ASC")
    fun getWorkoutsByGoalId(goalId: String): Flow<List<WorkoutEntity>>

    @Query("SELECT * FROM workouts WHERE scheduledDate BETWEEN :startDate AND :endDate ORDER BY scheduledDate ASC")
    fun getWorkoutsByDateRange(startDate: String, endDate: String): Flow<List<WorkoutEntity>>

    @Query("SELECT * FROM workouts WHERE id = :id")
    suspend fun getWorkoutById(id: String): WorkoutEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(workouts: List<WorkoutEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(workout: WorkoutEntity)

    @Query("DELETE FROM workouts WHERE id = :id")
    suspend fun deleteById(id: String)

    @Query("DELETE FROM workouts WHERE goalId = :goalId")
    suspend fun deleteByGoalId(goalId: String)

    @Query("DELETE FROM workouts")
    suspend fun clearAll()
}
