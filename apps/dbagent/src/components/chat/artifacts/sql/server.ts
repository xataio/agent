import { createDocumentHandler } from '../server';

export const sqlDocumentHandler = createDocumentHandler<'sql'>({
  kind: 'sql',
  onCreateDocument: async ({ title, dataStream }) => {
    // For SQL, the initial content is likely the query itself.
    // We might not need to call an AI model to generate it unless specified.
    // For now, we'll assume the 'title' or a dedicated field in `onCreateDocument` options
    // will contain the SQL query.
    const sqlQuery = title; // Or from another property if available

    // Stream the SQL query back.
    // If the query is short and doesn't need streaming, this can be simplified.
    dataStream.writeData({
      type: 'sql-delta', // Or a generic 'text-delta' if the client handles it
      content: sqlQuery
    });
    
    // Return the full query as the document content.
    return sqlQuery;
  },
  onUpdateDocument: async ({ document, description, dataStream }) => {
    // This function would be called if we want to update/modify an existing SQL query,
    // possibly using an AI model based on a 'description'.
    // For now, let's assume updates are direct or not yet implemented for SQL artifacts.
    
    // Example: if we were to stream back changes or a new query
    // const updatedSqlQuery = `/* Updated based on: ${description} */
${document.content}`;
    // dataStream.writeData({
    //   type: 'sql-delta',
    //   content: updatedSqlQuery 
    // });
    // return updatedSqlQuery;

    // For now, just return the existing content if no update logic is in place.
    dataStream.writeData({
        type: 'sql-delta',
        content: document.content
    });
    return document.content;
  }
});
