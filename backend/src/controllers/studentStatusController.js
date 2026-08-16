const { pool } = require('../config/database');

const setStudentStatus = async (req, res, isActive) => {
  const { id } = req.params;
  let connection;

  try {
    connection = await pool.getConnection();

    // Keep this update compatible with both the legacy and newer students schemas.
    // Some deployed databases do not have all of the newer timestamp/link columns.
    const [updateResult] = await connection.query(
      'UPDATE students SET is_active = ? WHERE id = ?',
      [isActive ? 1 : 0, id]
    );

    if (updateResult.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const [studentRows] = await connection.query(
      'SELECT id, student_id, full_name, is_active FROM students WHERE id = ? LIMIT 1',
      [id]
    );

    const student = studentRows[0];

    // Legacy versions created a users row for each student, while newer versions
    // keep students separate from staff authentication. Synchronize the legacy
    // login when possible, but never fail the student status update because that
    // optional relationship/table shape differs between deployments.
    if (student?.student_id) {
      try {
        await connection.query(
          'UPDATE users SET is_active = ? WHERE student_id = ?',
          [isActive ? 1 : 0, student.student_id]
        );
      } catch (syncError) {
        console.warn(
          `Student ${isActive ? 'activation' : 'deactivation'} login sync skipped:`,
          syncError.message
        );
      }
    }

    return res.json({
      success: true,
      message: `Student ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: student
    });
  } catch (error) {
    console.error(`Student ${isActive ? 'activation' : 'deactivation'} error:`, error);
    return res.status(500).json({
      success: false,
      message: `Failed to ${isActive ? 'activate' : 'deactivate'} student`
    });
  } finally {
    if (connection) connection.release();
  }
};

exports.activateStudent = (req, res) => setStudentStatus(req, res, true);
exports.deactivateStudent = (req, res) => setStudentStatus(req, res, false);
