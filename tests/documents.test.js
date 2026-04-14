const { describe, it, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { setup, cleanDb, teardown, agent, makeFamilyMember, makeAppointment, makeDocument } = require('./helpers');

describe('Medical Documents API', () => {
  before(() => setup());
  beforeEach(() => cleanDb());
  after(() => teardown());

  const validDoc = {
    type: 'prescription',
    title: 'Blood Test Report',
    file_name: 'blood-test-2026.pdf',
    file_path: '/uploads/docs/blood-test-2026.pdf',
    file_size: 102400,
    mime_type: 'application/pdf',
  };

  describe('POST /api/documents', () => {
    it('should create a new document', async () => {
      const res = await agent()
        .post('/api/documents')
        .send(validDoc)
        .expect(201);

      assert.ok(res.body.id);
      assert.equal(res.body.type, 'prescription');
      assert.equal(res.body.title, 'Blood Test Report');
      assert.equal(res.body.file_name, 'blood-test-2026.pdf');
      assert.equal(res.body.file_size, 102400);
      assert.equal(res.body.mime_type, 'application/pdf');
    });

    it('should create document with all fields', async () => {
      const member = makeFamilyMember();
      const appointment = makeAppointment();
      const res = await agent()
        .post('/api/documents')
        .send({
          ...validDoc,
          family_member_id: member.id,
          appointment_id: appointment.id,
          type: 'lab_report',
          notes: 'Annual checkup results',
          document_date: '2026-04-10',
          doctor_name: 'Dr. Sharma',
          hospital: 'City Hospital'
        })
        .expect(201);

      assert.equal(res.body.family_member_id, member.id);
      assert.equal(res.body.appointment_id, appointment.id);
      assert.equal(res.body.type, 'lab_report');
      assert.equal(res.body.notes, 'Annual checkup results');
      assert.equal(res.body.document_date, '2026-04-10');
      assert.equal(res.body.doctor_name, 'Dr. Sharma');
      assert.equal(res.body.hospital, 'City Hospital');
    });

    it('should reject when type is missing', async () => {
      const { type, ...rest } = validDoc;
      await agent().post('/api/documents').send(rest).expect(400);
    });

    it('should reject when title is missing', async () => {
      const { title, ...rest } = validDoc;
      await agent().post('/api/documents').send(rest).expect(400);
    });

    it('should reject when file_name is missing', async () => {
      const { file_name, ...rest } = validDoc;
      await agent().post('/api/documents').send(rest).expect(400);
    });

    it('should reject when file_path is missing', async () => {
      const { file_path, ...rest } = validDoc;
      await agent().post('/api/documents').send(rest).expect(400);
    });

    it('should reject when file_size is missing', async () => {
      const { file_size, ...rest } = validDoc;
      await agent().post('/api/documents').send(rest).expect(400);
    });

    it('should reject when mime_type is missing', async () => {
      const { mime_type, ...rest } = validDoc;
      await agent().post('/api/documents').send(rest).expect(400);
    });

    it('should reject invalid type', async () => {
      await agent().post('/api/documents').send({ ...validDoc, type: 'invalid' }).expect(400);
    });

    it('should reject empty title', async () => {
      await agent().post('/api/documents').send({ ...validDoc, title: '' }).expect(400);
    });
  });

  describe('GET /api/documents', () => {
    it('should return empty list when no documents exist', async () => {
      const res = await agent().get('/api/documents').expect(200);
      assert.deepStrictEqual(res.body.data, []);
      assert.equal(res.body.total, 0);
    });

    it('should return all documents for user', async () => {
      makeDocument({ title: 'Doc 1' });
      makeDocument({ title: 'Doc 2' });

      const res = await agent().get('/api/documents').expect(200);
      assert.equal(res.body.data.length, 2);
    });

    it('should filter by type', async () => {
      makeDocument({ type: 'prescription' });
      makeDocument({ type: 'lab_report' });

      const res = await agent().get('/api/documents?type=prescription').expect(200);
      assert.equal(res.body.data.length, 1);
      assert.equal(res.body.data[0].type, 'prescription');
    });

    it('should filter by family member', async () => {
      const member = makeFamilyMember();
      makeDocument({ family_member_id: member.id });
      makeDocument({ family_member_id: null });

      const res = await agent().get(`/api/documents?family_member_id=${member.id}`).expect(200);
      assert.equal(res.body.data.length, 1);
    });

    it('should filter by appointment', async () => {
      const appointment = makeAppointment();
      makeDocument({ appointment_id: appointment.id });
      makeDocument({ appointment_id: null });

      const res = await agent().get(`/api/documents?appointment_id=${appointment.id}`).expect(200);
      assert.equal(res.body.data.length, 1);
    });

    it('should filter by date range', async () => {
      makeDocument({ document_date: '2026-03-01' });
      makeDocument({ document_date: '2026-04-15' });
      makeDocument({ document_date: '2026-05-01' });

      const res = await agent().get('/api/documents?from=2026-04-01&to=2026-04-30').expect(200);
      assert.equal(res.body.data.length, 1);
    });

    it('should paginate results', async () => {
      for (let i = 0; i < 5; i++) makeDocument({ title: `Doc ${i}` });

      const res = await agent().get('/api/documents?page=1&limit=2').expect(200);
      assert.equal(res.body.data.length, 2);
      assert.equal(res.body.total, 5);
    });

    it('should sort by title asc', async () => {
      makeDocument({ title: 'Zebra report' });
      makeDocument({ title: 'Alpha report' });

      const res = await agent().get('/api/documents?sort=title&order=asc').expect(200);
      assert.equal(res.body.data[0].title, 'Alpha report');
    });
  });

  describe('GET /api/documents/:id', () => {
    it('should return a single document', async () => {
      const doc = makeDocument({ title: 'X-Ray' });
      const res = await agent().get(`/api/documents/${doc.id}`).expect(200);
      assert.equal(res.body.id, doc.id);
      assert.equal(res.body.title, 'X-Ray');
    });

    it('should return 404 for non-existent document', async () => {
      await agent().get('/api/documents/00000000-0000-0000-0000-000000000000').expect(404);
    });

    it('should return 404 for another user\'s document', async () => {
      const doc = makeDocument({ user_id: 999 });
      await agent().get(`/api/documents/${doc.id}`).expect(404);
    });
  });

  describe('PUT /api/documents/:id', () => {
    it('should update a document', async () => {
      const doc = makeDocument({ title: 'Old Title' });
      const res = await agent()
        .put(`/api/documents/${doc.id}`)
        .send({ title: 'New Title', doctor_name: 'Dr. New' })
        .expect(200);

      assert.equal(res.body.title, 'New Title');
      assert.equal(res.body.doctor_name, 'Dr. New');
    });

    it('should partially update a document', async () => {
      const doc = makeDocument({ title: 'Original', notes: '' });
      const res = await agent()
        .put(`/api/documents/${doc.id}`)
        .send({ notes: 'Updated notes' })
        .expect(200);

      assert.equal(res.body.title, 'Original');
      assert.equal(res.body.notes, 'Updated notes');
    });

    it('should return 404 when updating non-existent document', async () => {
      await agent()
        .put('/api/documents/00000000-0000-0000-0000-000000000000')
        .send({ title: 'Test' })
        .expect(404);
    });
  });

  describe('DELETE /api/documents/:id', () => {
    it('should delete a document', async () => {
      const doc = makeDocument();
      const res = await agent().delete(`/api/documents/${doc.id}`).expect(200);
      assert.ok(res.body.ok);

      await agent().get(`/api/documents/${doc.id}`).expect(404);
    });

    it('should return 404 when deleting non-existent document', async () => {
      await agent().delete('/api/documents/00000000-0000-0000-0000-000000000000').expect(404);
    });
  });
});
