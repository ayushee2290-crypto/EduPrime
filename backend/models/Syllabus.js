const db = require('../config/database');
const logger = require('../config/logger');

class Syllabus {
    // Get syllabus for a course
    static async getByCourse(courseId) {
        try {
            const syllabus = await db.getMany(`
                SELECT 
                    s.id as subject_id,
                    s.name as subject_name,
                    s.code as subject_code,
                    json_agg(
                        jsonb_build_object(
                            'id', sy.id,
                            'chapter_name', sy.chapter_name,
                            'chapter_order', sy.chapter_order,
                            'topics', sy.topics,
                            'hours_required', sy.hours_required,
                            'is_completed', sy.is_completed,
                            'completion_date', sy.completion_date,
                            'resources', sy.resources
                        ) ORDER BY sy.chapter_order
                    ) as chapters
                FROM subjects s
                JOIN course_subjects cs ON cs.subject_id = s.id
                LEFT JOIN syllabus sy ON sy.subject_id = s.id AND sy.course_id = $1
                WHERE cs.course_id = $1
                GROUP BY s.id, s.name, s.code
                ORDER BY s.name
            `, [courseId]);
            return syllabus;
        } catch (error) {
            logger.error('Error fetching syllabus:', error);
            throw error;
        }
    }

    // Get syllabus coverage for a batch
    static async getBatchCoverage(batchId) {
        try {
            const coverage = await db.getMany(`
                SELECT 
                    s.name as subject_name,
                    COUNT(sy.id) as total_chapters,
                    COUNT(CASE WHEN sc.is_completed THEN 1 END) as completed_chapters,
                    ROUND(
                        COUNT(CASE WHEN sc.is_completed THEN 1 END) * 100.0 / 
                        NULLIF(COUNT(sy.id), 0), 2
                    ) as coverage_percent,
                    json_agg(
                        jsonb_build_object(
                            'chapter_name', sy.chapter_name,
                            'is_completed', COALESCE(sc.is_completed, false),
                            'completion_date', sc.completion_date,
                            'faculty_notes', sc.notes
                        ) ORDER BY sy.chapter_order
                    ) as chapters
                FROM batches b
                JOIN courses c ON c.id = b.course_id
                JOIN course_subjects cs ON cs.course_id = c.id
                JOIN subjects s ON s.id = cs.subject_id
                LEFT JOIN syllabus sy ON sy.course_id = c.id AND sy.subject_id = s.id
                LEFT JOIN syllabus_coverage sc ON sc.syllabus_id = sy.id AND sc.batch_id = $1
                WHERE b.id = $1
                GROUP BY s.id, s.name
                ORDER BY s.name
            `, [batchId]);
            return coverage;
        } catch (error) {
            logger.error('Error fetching batch coverage:', error);
            throw error;
        }
    }

    // Update syllabus coverage (mark chapter as completed)
    static async updateCoverage(data) {
        try {
            const result = await db.insert(`
                INSERT INTO syllabus_coverage (
                    batch_id, syllabus_id, is_completed, completion_date,
                    faculty_id, notes
                ) VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (batch_id, syllabus_id)
                DO UPDATE SET
                    is_completed = $3,
                    completion_date = $4,
                    faculty_id = $5,
                    notes = $6,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *
            `, [
                data.batch_id,
                data.syllabus_id,
                data.is_completed,
                data.completion_date || new Date(),
                data.faculty_id,
                data.notes
            ]);
            return result;
        } catch (error) {
            logger.error('Error updating syllabus coverage:', error);
            throw error;
        }
    }

    // Create syllabus chapter
    static async createChapter(data) {
        try {
            const result = await db.insert(`
                INSERT INTO syllabus (
                    course_id, subject_id, chapter_name, chapter_order,
                    topics, hours_required, resources
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *
            `, [
                data.course_id,
                data.subject_id,
                data.chapter_name,
                data.chapter_order,
                data.topics || [],
                data.hours_required || 0,
                data.resources || {}
            ]);
            return result;
        } catch (error) {
            logger.error('Error creating syllabus chapter:', error);
            throw error;
        }
    }

    // Bulk import syllabus
    static async bulkImport(courseId, syllabusData) {
        try {
            const results = [];
            for (const subject of syllabusData) {
                for (const chapter of subject.chapters) {
                    const result = await this.createChapter({
                        course_id: courseId,
                        subject_id: subject.subject_id,
                        chapter_name: chapter.name,
                        chapter_order: chapter.order,
                        topics: chapter.topics,
                        hours_required: chapter.hours
                    });
                    results.push(result);
                }
            }
            return results;
        } catch (error) {
            logger.error('Error bulk importing syllabus:', error);
            throw error;
        }
    }
}

module.exports = Syllabus;
