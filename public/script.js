document.getElementById('registroForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    // Obter valores dos campos
    const nome = document.getElementById('nome').value.trim();
    const horario = document.getElementById('horario').value;
    const diaSemana = document.getElementById('diaSemana').value;
    const mensagem = document.getElementById('mensagem');
    const curso = document.getElementById('curso').value;

    // Validação dos campos obrigatórios
    if (!nome || !horario || !diaSemana || !curso) {
        mensagem.textContent = 'Preencha todos os campos!';
        return;
    }

    try {
        // Verificar se já existe o mesmo nome, curso, dia e horário
        const checkResponse = await fetch(`/verificarRegistro?nome=${nome}&curso=${curso}&diaSemana=${diaSemana}&horario=${horario}`);
        const checkResult = await checkResponse.json();
        
        console.log('Resultado da verificação:', checkResult); // Verifique a resposta da API

        if (checkResult.exists) {
            mensagem.textContent = 'Este aluno já está registrado para este curso, dia e horário!';
            return;
        }

        // Caso não exista, registrar o aluno
        const response = await fetch('/registrar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, horario, diaSemana, curso })
        });

        const result = await response.json();
        console.log('Resultado do registro:', result); // Verifique a resposta da API
        mensagem.textContent = result.message;

    } catch (error) {
        console.error('Erro ao registrar:', error);
        mensagem.textContent = 'Erro ao registrar, tente novamente.';
    }
});
