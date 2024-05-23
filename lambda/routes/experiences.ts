import { Hono } from 'hono';
import {
  initAWS,
  uploadDocuments,
  prepareItemToSave,
  saveItemToDynamoDB,
  handleDocumentUpload,
  updateDynamoDBDocuments,
  getExperienceData,
  getExperienceItem,
} from '../helpers/experienceHelpers';

const { s3, dynamoDb } = initAWS();

const experiences = new Hono();

// Adds experience data to DynamoDB and uploads documents to S3
experiences.post('/', async (c) => {
  const data = await c.req.json();

  const documents = await uploadDocuments(data.documents, data.title, s3);
  data.documents = documents;

  const itemToSave = prepareItemToSave(data);

  try {
    await saveItemToDynamoDB(itemToSave, dynamoDb);
    return c.json({
      message: 'Data saved and PDFs uploaded successfully',
      data: itemToSave,
    });
  } catch (error) {
    console.error('Error saving to DynamoDB:', error);
    return c.json({ error: 'Failed to save data', details: error });
  }
});

experiences.post('/:id', async (c) => {
  const id = c.req.param('id');
  const document = await c.req.json();

  if (!id || !document || !document.path) {
    return c.json({ error: 'Required data missing' }, 400);
  }

  try {
    const newDocument = await handleDocumentUpload(document, id, s3);
    await updateDynamoDBDocuments(newDocument, id, dynamoDb);
    return c.json({
      message: 'Document uploaded successfully',
      data: { title: document.title, path: '' },
    });
  } catch (error) {
    console.error('Error uploading document to S3:', error);
    return c.json({ error: 'Failed to upload document', details: error });
  }
});

experiences.get('/', async (c) => {
  try {
    const data = await getExperienceData(dynamoDb);
    return c.json({
      message: 'Data retrieved successfully',
      data,
    });
  } catch (error) {
    return c.json({ error: 'Failed to retrieve data', details: error });
  }
});

experiences.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    if (!id) {
      return c.json({ error: 'No ID provided' }, 400);
    }
    const data = await getExperienceItem(id, dynamoDb, s3);
    return c.json({
      message: 'Experience retrieved successfully',
      data,
    });
  } catch (error) {
    return c.json({ error: 'Failed to retrieve data', details: error });
  }
});

export default experiences;
