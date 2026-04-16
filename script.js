// Substitua pelas suas chaves reais se forem diferentes
const supabaseUrl = 'https://apiznmmzyrxcpsephpre.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwaXpubW16eXJ4Y3BzZXBocHJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNzA1ODQsImV4cCI6MjA5MTk0NjU4NH0.jKgZuDlPeR3d_gCIQofAGz7dPU5g5BJ_xx4Ye_stnaw';

const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('.contato-form');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = form.querySelector('button');
            const originalText = btn.innerText;
            btn.innerText = "Enviando...";
            btn.disabled = true;

            // Pegando os valores pelos IDs
            const dados = {
                nome_empresa: document.getElementById('nome_empresa').value,
                email: document.getElementById('email').value,
                telefone: document.getElementById('telefone').value,
                servico: document.getElementById('servico').value,
                mensagem: document.getElementById('mensagem').value
            };

            const { data, error } = await _supabase
                .from('orcamentos')
                .insert([dados]);

            if (error) {
                console.error("Erro Supabase:", error);
                alert("Erro ao enviar: " + error.message);
            } else {
                alert("Orçamento enviado com sucesso!");
                form.reset();
            }

            btn.innerText = originalText;
            btn.disabled = false;
        });
    }
});