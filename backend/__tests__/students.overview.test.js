process.env.NODE_ENV = 'test';

const request = require('supertest');

// Mock DB layer so tests don't depend on docker/db
jest.mock('../config/database', () => {
  const actual = jest.requireActual('../config/database');
  return {
    ...actual,
    getOne: jest.fn(async (sql, params) => {
      // used by students overview: to_regclass check
      if (/to_regclass\(\$1\)/i.test(sql)) return { regclass: null };

      return null;
    }),
    getMany: jest.fn(async () => []),
  };
});

jest.mock('../models/Student', () => ({
  findById: jest.fn(async (id) => ({
    id,
    first_name: 'Test',
    last_name: 'Student',
    phone: '9999999999',
    batch_names: [],
    batch_ids: [],
  })),
}));

jest.mock('../models/Attendance', () => ({
  getStudentSummary: jest.fn(async () => []),
}));

jest.mock('../models/Fee', () => ({
  findByStudent: jest.fn(async () => []),
}));

jest.mock('../models/Exam', () => ({
  getStudentResults: jest.fn(async () => []),
}));

const app = require('../server');

describe('GET /api/students/:id/overview', () => {
  it('returns consolidated overview payload', async () => {
    const studentId = '11111111-1111-1111-1111-111111111111';

    const res = await request(app)
      .get(`/api/students/${studentId}/overview`)
      .expect(200);

    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('student');
    expect(res.body.data.student).toHaveProperty('id', studentId);
    expect(res.body.data).toHaveProperty('batches');
    expect(res.body.data).toHaveProperty('attendance_summary');
    expect(res.body.data).toHaveProperty('fees');
    expect(res.body.data).toHaveProperty('fee_summary');
    expect(res.body.data).toHaveProperty('recent_results');
  });
});
