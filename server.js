const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, './data');
const DATA_FILE = path.join(DATA_DIR, 'Aluno.json');
const CHAMADA_FILE = path.join(DATA_DIR, 'chamada.json');

// Middleware
app.use(cors({
  origin: '*' // Em produção, substitua por um domínio específico.
}));
app.use(express.json());
app.use(express.static('public'));

// Função para ler JSON com tratamento de erro detalhado
const lerJSON = (filePath) => {
    try {
        if (!fs.existsSync(filePath)) return [];
        const data = fs.readFileSync(filePath, 'utf8');
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error(`Erro ao ler ${filePath}:`, error.message);
        return [];
    }
};

// Função para salvar JSON com tratamento de erro detalhado
const salvarJSON = (filePath, data) => {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error(`Erro ao salvar ${filePath}:`, error.message);
    }
};

// Criar pasta 'data' se não existir
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(DATA_FILE)) salvarJSON(DATA_FILE, []);
if (!fs.existsSync(CHAMADA_FILE)) salvarJSON(CHAMADA_FILE, []);

// Validação de entrada para alunos
const validarDadosAluno = ({ nome, horario, diaSemana, curso }) =>
    nome && horario && diaSemana && curso
        ? { valido: true }
        : { valido: false, mensagem: 'Todos os campos são obrigatórios!' };

// Validação de entrada para chamada
const validarDadosChamada = ({ horario, diaSemana, presentes, ausentes }) =>
    horario && diaSemana && Array.isArray(presentes) && Array.isArray(ausentes)
        ? { valido: true }
        : { valido: false, mensagem: 'Dados incompletos para registrar a chamada.' };

// Rota para verificar se o aluno já está registrado
app.get('/verificarRegistro', (req, res) => {
    const { nome, curso, diaSemana, horario } = req.query;
    const alunos = lerJSON(DATA_FILE);
    const alunoExistente = alunos.some(aluno =>
        aluno.nome === nome && aluno.curso === curso && aluno.diaSemana === diaSemana && aluno.horario === horario
    );
    res.json({ exists: alunoExistente });
});

// Rota para registrar aluno
app.post('/registrar', (req, res) => {
    const { valido, mensagem } = validarDadosAluno(req.body);
    if (!valido) return res.status(400).json({ error: mensagem });

    try {
        const alunos = lerJSON(DATA_FILE);
        alunos.push(req.body);
        salvarJSON(DATA_FILE, alunos);
        res.json({ message: 'Aluno registrado com sucesso!' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao registrar aluno.' });
    }
});

// Rota para obter alunos filtrados
app.get('/alunos', (req, res) => {
    try {
        const { curso, horario, diaSemana } = req.query;
        const alunos = lerJSON(DATA_FILE).filter(aluno =>
            (!curso || aluno.curso === curso) &&
            (!horario || aluno.horario === horario) &&
            (!diaSemana || aluno.diaSemana === diaSemana)
        );
        res.json(alunos.sort((a, b) => a.nome.localeCompare(b.nome)));
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar alunos.' });
    }
});

// Rota para registrar chamada
app.post('/registrarChamada', (req, res) => {
    const { valido, mensagem } = validarDadosChamada(req.body);
    if (!valido) return res.status(400).json({ error: mensagem });

    try {
        const { horario, diaSemana, presentes, ausentes, data, hora } = req.body;
        const dataAtual = new Date();
        const dataFormatada = data || `${dataAtual.getDate()}/${dataAtual.getMonth() + 1}/${dataAtual.getFullYear()}`;
        const diaDoMes = dataFormatada.split('/')[0];

        const chamadas = lerJSON(CHAMADA_FILE);
        if (chamadas.some(chamada => chamada.data.split('/')[0] === diaDoMes && chamada.horario === horario)) {
            return res.status(400).json({ error: `Já existe uma chamada registrada para este dia (${dataFormatada}) no horário ${horario}.` });
        }

        chamadas.push({
            horario,
            diaSemana,
            presentes,
            ausentes,
            data: dataFormatada,
            hora: hora || `${dataAtual.getHours()}:${dataAtual.getMinutes()}:${dataAtual.getSeconds()}`
        });

        salvarJSON(CHAMADA_FILE, chamadas);
        res.json({ message: 'Chamada registrada com sucesso!' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao registrar chamada.' });
    }
});

// Rota para obter todas as chamadas de um aluno (ordenadas por data)
app.get('/chamada', (req, res) => {
    const { nome } = req.query;
    if (!nome) return res.status(400).json({ error: 'Nome do aluno é necessário.' });

    try {
        const chamadas = lerJSON(CHAMADA_FILE).filter(chamada =>
            chamada.presentes.includes(nome) || chamada.ausentes.includes(nome)
        );

        chamadas.sort((a, b) => {
            const [diaA, mesA, anoA] = a.data.split('/').map(Number);
            const [diaB, mesB, anoB] = b.data.split('/').map(Number);
            return new Date(anoA, mesA - 1, diaA) - new Date(anoB, mesB - 1, diaB);
        });

        res.json(chamadas);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar chamadas do aluno.' });
    }
});

// Rota para excluir aluno (verificando se há chamadas registradas)
app.delete('/alunos/:nome', (req, res) => {
    try {
        const nomeAluno = req.params.nome;
        let alunos = lerJSON(DATA_FILE);
        const chamadas = lerJSON(CHAMADA_FILE);

        // Verifica se o aluno possui chamadas registradas
        const temChamada = chamadas.some(chamada =>
            chamada.presentes.includes(nomeAluno) || chamada.ausentes.includes(nomeAluno)
        );

        if (temChamada) {
            return res.status(400).json({ error: 'Não é possível excluir o aluno, pois há chamadas registradas.' });
        }

        const novosAlunos = alunos.filter(aluno => aluno.nome !== nomeAluno);

        if (alunos.length === novosAlunos.length) {
            return res.status(404).json({ error: 'Aluno não encontrado.' });
        }

        salvarJSON(DATA_FILE, novosAlunos);
        res.json({ message: `Aluno ${nomeAluno} excluído com sucesso!` });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao excluir aluno.' });
    }
});

// Iniciar servidor
app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));
