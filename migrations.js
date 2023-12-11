const sqlite3 = require('sqlite3').verbose();

// Abrindo conexão com o banco de dados
const db = new sqlite3.Database('D:/zapia/configs.db');

// Atualiza a chave da API do OpenAI
db.run("UPDATE user_configs SET openAIAPIKey = 'sk-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'", (err) => {
  if (err) {
    console.error('Error:', err.message);
  } else {
    console.log('DB updated successfully!');
  }
  // Fechando a conexão com o banco de dados
  db.close();
});

// Exemplo de adição de coluna
// db.run("ALTER TABLE user_configs ADD COLUMN <column_name> TEXT DEFAULT 'algolia'", (err) => {
//   // Tratar erro ou sucesso
// });

// Exemplo de atualização de todos os valores de uma coluna
// db.run("UPDATE user_configs SET <column_name> = 1", (err) => {
//   // Tratar erro ou sucesso
// });
