// Função para buscar os alunos com filtros
async function getAlunos(curso = '', diaSemana = '', horario = '') {
    try {
        const response = await fetch(`/alunos?curso=${curso}&diaSemana=${diaSemana}&horario=${horario}`);
        if (!response.ok) throw new Error('Erro ao buscar alunos');
        return await response.json();
    } catch (error) {
        console.error(error);
        return []; // Retorna um array vazio em caso de erro
    }
}

// Função para buscar as chamadas de um aluno
async function getChamadas(nome) {
    try {
        const response = await fetch(`/chamada?nome=${nome}`);
        if (!response.ok) throw new Error('Erro ao buscar chamadas');
        return await response.json();
    } catch (error) {
        console.error(error);
        return []; // Retorna um array vazio em caso de erro
    }
}

// Função para calcular a presença, faltas e faltas consecutivas de um aluno
function calcularFrequencia(chamadas, aluno) {
    let ausentes = 0;
    let presencas = 0;
    let ausentesConsecutivas = 0;

    chamadas.forEach(chamada => {
        if (chamada.presentes.includes(aluno.nome)) {
            presencas++;
            ausentesConsecutivas = 0; // Reseta a contagem de faltas consecutivas
        } else if (chamada.ausentes.includes(aluno.nome)) {
            ausentes++;
            ausentesConsecutivas++;
        }
    });

    return { ausentes, presencas, ausentesConsecutivas };
}

// Função para criar a linha de cada aluno
function criarLinhaAluno(aluno, presencas, ausentes, ausentesConsecutivas) {
    const alunoRow = document.createElement('tr');
    
    alunoRow.innerHTML = `
        <td>${aluno.nome}</td>
        <td>${aluno.curso}</td>
        <td>${aluno.diaSemana}</td>
        <td>${aluno.horario}</td>
        <td>${presencas}</td>
        <td>${ausentes}</td>
        <td class="alerta">${ausentesConsecutivas >= 3 ? 'Alerta: Faltou 3 dias seguidos!' : ''}</td>
        <td><button class="deleteBtn" onclick="confirmarExclusao('${aluno.nome}')">Excluir</button></td>
    `;
    return alunoRow;
}

// Função para renderizar a lista de alunos com suas frequências
async function renderAlunos(alunos) {
    const alunosBody = document.getElementById('alunosBody');
    alunosBody.innerHTML = ''; // Limpa o conteúdo anterior

    // Faz as requisições para todas as chamadas dos alunos em paralelo
    const chamadasPromises = alunos.map(aluno => getChamadas(aluno.nome));
    const chamadas = await Promise.all(chamadasPromises);

    alunos.forEach((aluno, index) => {
        const { ausentes, presencas, ausentesConsecutivas } = calcularFrequencia(chamadas[index], aluno);
        const alunoRow = criarLinhaAluno(aluno, presencas, ausentes, ausentesConsecutivas);
        alunosBody.appendChild(alunoRow);
    });
}

// Função para aplicar os filtros e atualizar a lista de alunos
async function filterAlunos() {
    const curso = document.getElementById('cursoFilter').value;
    const diaSemana = document.getElementById('diaSemanaFilter').value;
    const horario = document.getElementById('horarioFilter').value;

    const alunos = await getAlunos(curso, diaSemana, horario);
    renderAlunos(alunos);
}

function confirmarExclusao(nomeAluno) {
    const confirmar = window.confirm(`Você tem certeza que deseja excluir o aluno ${nomeAluno}?`);

    if (confirmar) {
        excluirAluno(nomeAluno);
    }
}

async function excluirAluno(nomeAluno) {
    try {
        const response = await fetch(`/alunos/${nomeAluno}`, {
            method: 'DELETE',
        });

        // Verificar o status da resposta para garantir que foi bem-sucedido
        if (!response.ok) {
            const errorMessage = await response.text(); // Captura a resposta de erro do servidor, se houver
            throw new Error(`Erro ao excluir aluno: ${errorMessage}`);
        }

        alert(`Aluno ${nomeAluno} excluído com sucesso!`);
        filterAlunos(); // Atualiza a lista após a exclusão
    } catch (error) {
        console.error('Detalhes do erro ao excluir o aluno:', error); // Log mais detalhado
        alert('Erro ao tentar excluir o aluno. Verifique o console para mais detalhes.');
    }
}

// Carrega os alunos ao iniciar a página
window.onload = filterAlunos;
