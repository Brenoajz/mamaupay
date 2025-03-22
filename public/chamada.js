async function buscarAlunos() {
    const horario = document.getElementById('horario').value;
    const diaSemana = document.getElementById('diaSemana').value;
    const listaAlunos = document.getElementById('listaAlunos');

    if (!horario || !diaSemana) {
        alert("Por favor, selecione um horário e um dia da semana.");
        return;
    }

    try {
        const response = await fetch(`/alunos?horario=${horario}&diaSemana=${diaSemana}`);
        const alunos = await response.json();

        listaAlunos.innerHTML = alunos.length === 0
            ? '<tr><td>Nenhum aluno encontrado para este horário e dia.</td></tr>'
            : alunos.map(aluno => `
                <tr>
                    <td>${aluno.nome}</td>
                    <td><input type="checkbox" class="presenca" data-nome="${aluno.nome}"></td>
                    <td><input type="checkbox" class="falta" data-nome="${aluno.nome}"></td>
                </tr>
            `).join('');
    } catch (error) {
        listaAlunos.innerHTML = '<tr><td>Erro ao buscar alunos.</td></tr>';
    }
}

document.getElementById('presencaForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const horario = document.getElementById('horario').value;
    const diaSemana = document.getElementById('diaSemana').value;
    const checkboxesPresenca = document.querySelectorAll('.presenca');
    const checkboxesFalta = document.querySelectorAll('.falta');
    const presentes = [];
    const ausentes = [];
    
    let preenchidoCorretamente = true;

    checkboxesPresenca.forEach((checkbox, index) => {
        const faltaCheckbox = checkboxesFalta[index];

        if (checkbox.checked && faltaCheckbox.checked) {
            alert(`O aluno ${checkbox.dataset.nome} não pode estar presente e ausente ao mesmo tempo!`);
            preenchidoCorretamente = false;
        } else if (!checkbox.checked && !faltaCheckbox.checked) {
            alert(`O aluno ${checkbox.dataset.nome} precisa ter presença ou falta marcada!`);
            preenchidoCorretamente = false;
        } else if (checkbox.checked) {
            presentes.push(checkbox.dataset.nome);
        } else {
            ausentes.push(faltaCheckbox.dataset.nome);
        }
    });

    // Se a validação falhou, interrompe a execução
    if (!preenchidoCorretamente) {
        return;
    }

    const chamadaData = {
        horario,
        diaSemana,
        presentes,
        ausentes,
        data: new Date().toLocaleDateString(),
        hora: new Date().toLocaleTimeString(),
    };

    try {
        const response = await fetch('/registrarChamada', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(chamadaData)
        });

        const result = await response.json();
        alert(result.message);
    } catch (error) {
        alert('Erro ao registrar chamada.');
    }
});
