const _supabase = window._supabase;

function mostrarFeedback(mensagem, tipo = 'success') {
    const antigo = document.querySelector('.toast');
    if (antigo) antigo.remove();

    const toast = document.createElement('div');
    toast.className = `toast ${tipo === 'error' ? 'error' : ''}`;
    toast.innerHTML = `
        <i class="fas ${tipo === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i>
        <span>${mensagem}</span>
    `;
    
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

function soDigitos(valor) {
    return String(valor || '').replace(/\D/g, '');
}

function whatsappComercialLink(dados = {}) {
    const nomeEmpresa = (dados.nome_empresa || '').trim();
    const servico = (dados.servico || '').trim();
    const telefone = soDigitos(dados.telefone || '');
    const mensagem = (dados.mensagem || '').trim();

    const linhas = [
        'Olá! Quero um orçamento com a Expresso TNG.',
        nomeEmpresa ? `Empresa: ${nomeEmpresa}` : null,
        servico ? `Serviço: ${servico}` : null,
        telefone ? `Telefone: ${telefone}` : null,
        mensagem ? `Mensagem: ${mensagem}` : null
    ].filter(Boolean);

    const text = encodeURIComponent(linhas.join('\n'));
    return `https://wa.me/5531993618518?text=${text}`;
}

const VAGAS = [
    {
        titulo: 'Auxiliar de Depósito / Carregamento',
        local: 'CD – Belo Horizonte/MG',
        tipo: 'Operacional',
        regime: 'CLT / Temporário',
        turno: 'Diurno/Noturno',
        beneficios: ['Transporte', 'Alimentação', 'Treinamento'],
    },
    {
        titulo: 'Separador (Picking) / Conferente',
        local: 'CD – Contagem/MG',
        tipo: 'Operacional',
        regime: 'CLT',
        turno: 'Diurno',
        beneficios: ['Transporte', 'Alimentação'],
    },
    {
        titulo: 'Ajudante de Carga e Descarga',
        local: 'Região Metropolitana – MG',
        tipo: 'Operacional',
        regime: 'CLT / Diária',
        turno: 'Escala',
        beneficios: ['Transporte', 'Alimentação'],
    },
    {
        titulo: 'Auxiliar de Pátio / Apoio Logístico',
        local: 'CD – Betim/MG',
        tipo: 'Operacional',
        regime: 'CLT',
        turno: 'Escala',
        beneficios: ['Transporte', 'Alimentação', 'EPI'],
    }
];

function whatsappVagasLink(vaga) {
    const linhas = [
        'Olá! Quero me candidatar a uma vaga na Expresso TNG.',
        vaga?.titulo ? `Vaga: ${vaga.titulo}` : null,
        vaga?.local ? `Local: ${vaga.local}` : null,
        'Meu nome é: ',
        'Meu WhatsApp é: '
    ].filter(Boolean);
    return `https://wa.me/5531993618518?text=${encodeURIComponent(linhas.join('\n'))}`;
}

function renderVagasCards(vagas) {
    return vagas.map(v => `
        <div class="servico-card" style="text-align:left; border: 1px solid #333; padding: 30px;">
            <div class="vaga-mini-head">
                <span class="badge" style="background:#FFD700; color:#000;">VAGA</span>
                <span style="color:#666; font-size:0.8rem;"><i class="fa-solid fa-location-dot"></i> ${v.local}</span>
            </div>

            <h3 class="vaga-mini-title" style="margin-top: 6px;">${v.titulo}</h3>

            <div class="vaga-mini-meta" style="margin-top: 12px;">
                <span><i class="fa-solid fa-briefcase"></i> <strong>Tipo:</strong> ${v.tipo}</span>
                <span><i class="fa-solid fa-id-card"></i> <strong>Regime:</strong> ${v.regime}</span>
                <span><i class="fa-regular fa-clock"></i> <strong>Turno:</strong> ${v.turno}</span>
            </div>

            <div style="margin-top: 16px; display:flex; gap:8px; flex-wrap:wrap;">
                ${(v.beneficios || []).map(b => `<span style="background: rgba(255,255,255,0.05); padding:6px 10px; border-radius:999px; font-size:0.8rem; border:1px solid rgba(255,255,255,0.08);">${b}</span>`).join('')}
            </div>

            <div style="margin-top: 20px; display:flex; gap:10px; flex-wrap:wrap;">
                <a class="btn-primary" target="_blank" rel="noopener noreferrer" href="${whatsappVagasLink(v)}" style="text-align:center;">
                    <i class="fa-brands fa-whatsapp"></i> Candidatar no WhatsApp
                </a>
                <a class="btn-secondary" target="_blank" rel="noopener noreferrer" href="https://wa.me/5531993618518?text=${encodeURIComponent('Olá! Quero saber quais vagas estão disponíveis e como funciona o processo.')}">
                    Tirar dúvidas
                </a>
            </div>
        </div>
    `).join('');
}

function carregarVagasHome() {
    const lista = document.getElementById('lista-vagas-home');
    if (!lista) return;
    lista.innerHTML = renderVagasCards(VAGAS.slice(0, 3));
}

function carregarVagasPage() {
    const lista = document.getElementById('lista-vagas');
    if (!lista) return;
    lista.innerHTML = renderVagasCards(VAGAS);
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('.contato-form');
    const navToggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelector('.nav-links');
    const ctaWhats = document.getElementById('cta-whats-comercial');

    if (navToggle && navLinks) {
        navToggle.addEventListener('click', () => {
            const aberto = navLinks.classList.toggle('is-open');
            navToggle.setAttribute('aria-expanded', aberto ? 'true' : 'false');
        });

        navLinks.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', () => {
                navLinks.classList.remove('is-open');
                navToggle.setAttribute('aria-expanded', 'false');
            });
        });
    }

    carregarVagasHome();
    carregarVagasPage();

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = form.querySelector('button');
            btn.innerText = "Processando...";
            btn.disabled = true;

            const dados = {
                nome_empresa: document.getElementById('nome_empresa').value,
                email: document.getElementById('email').value,
                telefone: document.getElementById('telefone').value,
                servico: document.getElementById('servico').value,
                mensagem: document.getElementById('mensagem').value
            };

            const telDigits = soDigitos(dados.telefone);
            if (telDigits.length < 10) {
                mostrarFeedback("Informe um WhatsApp com DDD.", "error");
                btn.innerText = "Solicitar Orçamento Agora";
                btn.disabled = false;
                return;
            }

            if (ctaWhats) {
                ctaWhats.href = whatsappComercialLink(dados);
            }

            const { error } = await _supabase.from('orcamentos').insert([dados]);

            if (error) {
                console.error("ERRO REAL:", error); // Olhe o console do navegador (F12)
                mostrarFeedback("Erro ao enviar. Verifique o banco de dados!", "error");
            } else {
                mostrarFeedback("Orçamento enviado! Entraremos em contato.");
                form.reset();
                if (ctaWhats) {
                    ctaWhats.href = whatsappComercialLink({});
                }
            }

            btn.innerText = "Solicitar Orçamento Agora";
            btn.disabled = false;
        });
    }
});