const { describe, it, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { setup, cleanDb, teardown, agent, makeAppointment, makeFamilyMember } = require('./helpers');

describe('Appointments', () => {
  before(() => setup());
  beforeEach(() => cleanDb());
  after(() => teardown());

  describe('GET /api/appointments', () => {
    it('returns empty array when no appointments exist', async () => {
      const res = await agent().get('/api/appointments').expect(200);
      assert.deepStrictEqual(res.body.data, []);
    });

    it('returns all appointments for user', async () => {
      makeAppointment({ doctor_name: 'Dr. A' });
      makeAppointment({ doctor_name: 'Dr. B' });

      const res = await agent().get('/api/appointments').expect(200);
      assert.equal(res.body.data.length, 2);
    });

    it('filters appointments by type', async () => {
      makeAppointment({ type: 'checkup' });
      makeAppointment({ type: 'specialist' });

      const res = await agent().get('/api/appointments?type=checkup').expect(200);
      assert.equal(res.body.data.length, 1);
      assert.equal(res.body.data[0].type, 'checkup');
    });

    it('filters appointments by status', async () => {
      makeAppointment({ status: 'scheduled' });
      makeAppointment({ status: 'completed' });

      const res = await agent().get('/api/appointments?status=scheduled').expect(200);
      assert.equal(res.body.data.length, 1);
    });

    it('filters appointments by date range', async () => {
      makeAppointment({ appointment_date: '2026-04-10' });
      makeAppointment({ appointment_date: '2026-04-15' });
      makeAppointment({ appointment_date: '2026-04-20' });

      const res = await agent().get('/api/appointments?from=2026-04-14&to=2026-04-16').expect(200);
      assert.equal(res.body.data.length, 1);
    });

    it('filters appointments by family member', async () => {
      const member = makeFamilyMember();
      makeAppointment({ family_member_id: member.id });
      makeAppointment({ family_member_id: null });

      const res = await agent().get(`/api/appointments?family_member_id=${member.id}`).expect(200);
      assert.equal(res.body.data.length, 1);
    });
  });

  describe('POST /api/appointments', () => {
    it('creates a new appointment', async () => {
      const res = await agent()
        .post('/api/appointments')
        .send({
          doctor_name: 'Dr. Johnson',
          hospital: 'City Hospital',
          type: 'checkup',
          appointment_date: '2026-05-01',
          appointment_time: '14:00',
          duration_minutes: 30
        })
        .expect(201);

      assert.ok(res.body.id);
      assert.equal(res.body.doctor_name, 'Dr. Johnson');
      assert.equal(res.body.type, 'checkup');
    });

    it('creates appointment without time', async () => {
      const res = await agent()
        .post('/api/appointments')
        .send({
          doctor_name: 'Dr. Smith',
          appointment_date: '2026-05-10'
        })
        .expect(201);

      assert.ok(!res.body.appointment_time);
    });

    it('returns 400 when doctor_name is missing', async () => {
      await agent()
        .post('/api/appointments')
        .send({ appointment_date: '2026-05-01' })
        .expect(400);
    });

    it('returns 400 when appointment_date is missing', async () => {
      await agent()
        .post('/api/appointments')
        .send({ doctor_name: 'Dr. Jones' })
        .expect(400);
    });

    it('returns 400 for invalid date format', async () => {
      await agent()
        .post('/api/appointments')
        .send({ doctor_name: 'Dr. Test', appointment_date: 'invalid-date' })
        .expect(400);
    });

    it('returns 400 for invalid time format', async () => {
      await agent()
        .post('/api/appointments')
        .send({
          doctor_name: 'Dr. Test',
          appointment_date: '2026-05-01',
          appointment_time: '25:99'
        })
        .expect(400);
    });
  });

  describe('GET /api/appointments/:id', () => {
    it('returns a single appointment', async () => {
      const appt = makeAppointment({ doctor_name: 'Dr. Test' });
      const res = await agent().get(`/api/appointments/${appt.id}`).expect(200);

      assert.equal(res.body.id, appt.id);
      assert.equal(res.body.doctor_name, 'Dr. Test');
    });

    it('returns 404 for non-existent appointment', async () => {
      await agent().get('/api/appointments/00000000-0000-0000-0000-000000000000').expect(404);
    });
  });

  describe('PUT /api/appointments/:id', () => {
    it('updates an appointment', async () => {
      const appt = makeAppointment({ doctor_name: 'Old Doctor', status: 'scheduled' });
      const res = await agent()
        .put(`/api/appointments/${appt.id}`)
        .send({ doctor_name: 'New Doctor', status: 'rescheduled' })
        .expect(200);

      assert.equal(res.body.doctor_name, 'New Doctor');
      assert.equal(res.body.status, 'rescheduled');
    });

    it('adds post-visit notes', async () => {
      const appt = makeAppointment({ status: 'scheduled' });
      const res = await agent()
        .put(`/api/appointments/${appt.id}`)
        .send({
          status: 'completed',
          post_visit_notes: 'Patient is doing well'
        })
        .expect(200);

      assert.equal(res.body.status, 'completed');
      assert.equal(res.body.post_visit_notes, 'Patient is doing well');
    });

    it('returns 404 when updating non-existent appointment', async () => {
      await agent()
        .put('/api/appointments/00000000-0000-0000-0000-000000000000')
        .send({ status: 'completed' })
        .expect(404);
    });
  });

  describe('DELETE /api/appointments/:id', () => {
    it('deletes an appointment', async () => {
      const appt = makeAppointment();
      const res = await agent().delete(`/api/appointments/${appt.id}`).expect(200);
      assert.ok(res.body.ok);

      await agent().get(`/api/appointments/${appt.id}`).expect(404);
    });

    it('returns 404 when deleting non-existent appointment', async () => {
      await agent().delete('/api/appointments/00000000-0000-0000-0000-000000000000').expect(404);
    });
  });

  describe('GET /api/appointments/upcoming', () => {
    it('returns upcoming appointments', async () => {
      const future = new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]; // 2 days ahead
      const past = new Date(Date.now() - 86400000).toISOString().split('T')[0]; // 1 day ago
      
      makeAppointment({ appointment_date: future, status: 'scheduled' });
      makeAppointment({ appointment_date: past, status: 'scheduled' });

      const res = await agent().get('/api/appointments/upcoming?days=7').expect(200);
      assert.ok(Array.isArray(res.body.data));
    });
  });
});
