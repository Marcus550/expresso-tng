const _supabase = window._supabase;

let _orcamentosCache = [];
let _orcamentosView = [];
let _orcamentosChannel = null;
let _reloadTimer = null;
const ADMIN_ID_FIELD = 'admin_id';

async function exigirAdmin() {
    const { data, error } = await _supabase.auth.getUser();
    const user = data?.user;

    if (error || !user) {
        window.location.href = "login.html";
        return null;
    }

    const { data: adminRow, error: adminErr } = await _supabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

    if (adminErr) {
        // Evita "loop" silencioso: informa o motivo no login
        const motivo = encodeURIComponent(adminErr.message || 'Sem permissão para validar admin.');
        await _supabase.auth.signOut();
        window.location.href = `login.html?erro=permissao&detalhe=${motivo}`;
        return null;
    }

    if (!adminRow) {
        await _supabase.auth.signOut();
        window.location.href = "login.html?erro=nao_admin";
        return null;
    }

    return user;
}

async function fazerLogoff() {
    await _supabase.auth.signOut();
    window.location.href = "login.html";
}

// 3. FUNÇÕES DE ORÇAMENTOS (CLIENTES)
async function carregarOrcamentos() {
    const container = document.getElementById('lista-orcamentos');
    const { data, error } = await _supabase
        .from('orcamentos')
        .select('*')
        .order('created_at', { ascending: false });

    if (error || !data) {
        if (container) {
            container.innerHTML = `
                <div class="admin-empty">
                    <p style="color:#aaa; margin-bottom: 10px;">Sem permissão ou sem dados.</p>
                    <p style="color:#666; font-size:0.9rem; margin-bottom: 10px;">
                        Confira as políticas RLS do Supabase para <strong>orcamentos</strong> e <strong>admin_users</strong>.
                    </p>
                    <div style="text-align:left; background: rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 14px; color:#bbb; font-size:0.9rem;">
                        <div style="color:#fff; font-weight:900; margin-bottom: 6px;">Detalhe técnico</div>
                        <div>${error ? String(error.message || error) : 'Sem detalhe do Supabase.'}</div>
                    </div>
                </div>
            `;
        }
        return;
    }

    _orcamentosCache = data;
    preencherFiltros(data);
    atualizarKPIs(data);
    renderLista();

    const last = document.getElementById('admin-last-update');
    if (last) last.textContent = `Atualizado: ${new Date().toLocaleString('pt-BR')}`;
}

function getRowId(row) {
    if (!row) return null;
    return row[ADMIN_ID_FIELD] ?? null;
}

function soDigitos(v) {
    return String(v || '').replace(/\D/g, '');
}

function formatData(dt) {
    if (!dt) return '—';
    const d = new Date(dt);
    return isNaN(d.getTime()) ? '—' : d.toLocaleString('pt-BR');
}

function preencherFiltros(data) {
    const select = document.getElementById('filtro-servico');
    if (!select) return;

    const atual = select.value;
    const servicos = Array.from(new Set((data || []).map(o => o.servico).filter(Boolean)))
        .sort((a, b) => String(a).localeCompare(String(b), 'pt-BR'));

    select.innerHTML = `
        <option value="">Todos os serviços</option>
        ${servicos.map(s => `<option value="${String(s).replace(/"/g, '&quot;')}">${s}</option>`).join('')}
    `;

    select.value = atual;
}

function normalizeStatus(s) {
    const v = String(s || '').trim().toLowerCase();
    if (!v) return 'novo';
    if (['novo', 'aceito', 'ignorado', 'bloqueado'].includes(v)) return v;
    return 'novo';
}

function statusBadge(status) {
    const s = normalizeStatus(status);
    if (s === 'aceito') return { label: 'ACEITO', bg: '#4ade80', fg: '#000' };
    if (s === 'ignorado') return { label: 'IGNORADO', bg: '#a3a3a3', fg: '#000' };
    if (s === 'bloqueado') return { label: 'BLOQUEADO', bg: '#ff4d4d', fg: '#000' };
    return { label: 'NOVO', bg: '#FFD700', fg: '#000' };
}

function atualizarKPIs(data) {
    const totalEl = document.getElementById('kpi-total');
    const hojeEl = document.getElementById('kpi-hoje');
    const d7El = document.getElementById('kpi-7d');

    const now = new Date();
    const startHoje = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const start7d = new Date(now);
    start7d.setDate(now.getDate() - 7);

    const total = (data || []).length;
    const hoje = (data || []).filter(o => o.created_at && new Date(o.created_at) >= startHoje).length;
    const d7 = (data || []).filter(o => o.created_at && new Date(o.created_at) >= start7d).length;

    if (totalEl) totalEl.textContent = String(total);
    if (hojeEl) hojeEl.textContent = String(hoje);
    if (d7El) d7El.textContent = String(d7);
}

function aplicarFiltros(data) {
    const q = (document.getElementById('busca')?.value || '').trim().toLowerCase();
    const servico = (document.getElementById('filtro-servico')?.value || '').trim();
    const status = (document.getElementById('filtro-status')?.value || '').trim().toLowerCase();

    return (data || []).filter(o => {
        if (servico && String(o.servico || '') !== servico) return false;
        if (status && normalizeStatus(o.status) !== status) return false;
        if (!q) return true;

        const hay = [
            o.nome_empresa,
            o.email,
            o.telefone,
            o.servico,
            o.mensagem
        ].filter(Boolean).join(' ').toLowerCase();

        return hay.includes(q);
    });
}

async function atualizarStatusOrcamento(id, status) {
    if (id == null) throw new Error('Orçamento sem admin_id.');
    const novoStatus = normalizeStatus(status);
    const { error } = await _supabase
        .from('orcamentos')
        .update({ status: novoStatus, handled_at: new Date().toISOString() })
        .eq(ADMIN_ID_FIELD, id);
    if (error) throw error;
}

async function deletarOrcamento(id) {
    if (id == null) throw new Error('Orçamento sem admin_id.');
    const { error } = await _supabase.from('orcamentos').delete().eq(ADMIN_ID_FIELD, id);
    if (error) throw error;
}

function renderLista() {
    const container = document.getElementById('lista-orcamentos');
    if (!container) return;

    const data = aplicarFiltros(_orcamentosCache);
    _orcamentosView = data;

    if (!data.length) {
        container.innerHTML = `
            <div class="admin-empty">
                <p style="color:#aaa; margin-bottom: 8px;">Nada encontrado.</p>
                <p style="color:#666; font-size:0.9rem;">Tente ajustar a busca ou o filtro.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = data.map((o, idx) => {
        const telDigits = soDigitos(o.telefone);
        const whats = telDigits ? `https://wa.me/55${telDigits}` : '#';
        const dataFmt = o.created_at ? new Date(o.created_at).toLocaleDateString('pt-BR') : '—';
        const badge = statusBadge(o.status);
        const rowId = getRowId(o);
        const hasId = rowId != null;

        return `
            <div class="admin-item">
                <div class="admin-item-top">
                    <span class="badge" style="background:${badge.bg}; color:${badge.fg};">${badge.label}</span>
                    <small style="color:#666;">${dataFmt}</small>
                </div>

                <div class="admin-company">${o.nome_empresa || 'Sem nome'}</div>

                <div class="admin-meta">
                    <span><i class="fa-regular fa-envelope"></i> ${o.email || '—'}</span>
                    <span><i class="fa-brands fa-whatsapp"></i> ${o.telefone || '—'}</span>
                    <span><i class="fa-solid fa-tag"></i> ${o.servico || '—'}</span>
                </div>

                <div class="admin-actions">
                    <button class="admin-mini-btn" data-acao="ver" data-idx="${idx}"><i class="fa-regular fa-eye"></i> Ver</button>
                    <a class="btn-primary" target="_blank" rel="noopener noreferrer" href="${whats}" ${telDigits ? '' : 'aria-disabled="true" style="opacity:0.5; pointer-events:none;"'}>
                        <i class="fa-brands fa-whatsapp"></i> WhatsApp
                    </a>
                    <button class="admin-mini-btn" data-acao="aceitar" data-idx="${idx}" ${hasId ? '' : 'disabled style="opacity:0.5; cursor:not-allowed;"'}>
                        <i class="fa-regular fa-circle-check"></i> Aceitar
                    </button>
                    <button class="admin-mini-btn" data-acao="ignorar" data-idx="${idx}" ${hasId ? '' : 'disabled style="opacity:0.5; cursor:not-allowed;"'}>
                        <i class="fa-regular fa-circle-xmark"></i> Ignorar
                    </button>
                    <button class="admin-mini-btn" data-acao="bloquear" data-idx="${idx}" ${hasId ? '' : 'disabled style="opacity:0.5; cursor:not-allowed;"'}>
                        <i class="fa-solid fa-ban"></i> Bloquear
                    </button>
                    <button class="admin-mini-btn" data-acao="deletar" data-idx="${idx}" ${hasId ? '' : 'disabled style="opacity:0.5; cursor:not-allowed;"'}>
                        <i class="fa-regular fa-trash-can"></i> Deletar
                    </button>
                </div>
                ${hasId ? '' : `<div style="margin-top:8px; color:#777; font-size:0.85rem;">
                    Para habilitar triagem/deleção, crie a coluna <strong>${ADMIN_ID_FIELD}</strong> no Supabase (SQL no final da conversa).
                </div>`}
            </div>
        `;
    }).join('');
}

function abrirModal(orc) {
    const modal = document.getElementById('admin-modal');
    if (!modal) return;

    const telDigits = soDigitos(orc.telefone);
    const whats = telDigits ? `https://wa.me/55${telDigits}?text=${encodeURIComponent('Olá! Vi sua solicitação de orçamento no site da Expresso TNG. Podemos conversar?')}` : '#';

    document.getElementById('modal-empresa').textContent = orc.nome_empresa || '—';
    document.getElementById('modal-servico').textContent = orc.servico || '—';
    document.getElementById('modal-email').textContent = orc.email || '—';
    document.getElementById('modal-tel').textContent = orc.telefone || '—';
    document.getElementById('modal-msg').textContent = orc.mensagem || 'Sem mensagem.';
    document.getElementById('modal-data').textContent = formatData(orc.created_at);

    const btnWhats = document.getElementById('modal-whats');
    if (btnWhats) {
        btnWhats.href = whats;
        btnWhats.style.pointerEvents = telDigits ? 'auto' : 'none';
        btnWhats.style.opacity = telDigits ? '1' : '0.5';
    }

    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
}

function fecharModal() {
    const modal = document.getElementById('admin-modal');
    if (!modal) return;
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
}

async function copiarTexto(txt) {
    try {
        await navigator.clipboard.writeText(String(txt || ''));
    } catch {
        // fallback silencioso
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const user = await exigirAdmin();
    if (!user) return;

    const title = document.getElementById('admin-title');
    if (title) title.innerText = `Olá, ${user.email}`;

    const busca = document.getElementById('busca');
    const filtro = document.getElementById('filtro-servico');
    const filtroStatus = document.getElementById('filtro-status');
    const recarregar = document.getElementById('btn-recarregar');

    if (busca) busca.addEventListener('input', () => renderLista());
    if (filtro) filtro.addEventListener('change', () => renderLista());
    if (filtroStatus) filtroStatus.addEventListener('change', () => renderLista());
    if (recarregar) recarregar.addEventListener('click', () => carregarOrcamentos());

    document.addEventListener('click', (e) => {
        const t = e.target;
        const btn = t?.closest?.('[data-acao="ver"]');
        if (btn) {
            const idx = Number(btn.getAttribute('data-idx'));
            const orc = Number.isFinite(idx) ? _orcamentosView[idx] : null;
            if (orc) abrirModal(orc);
        }

        const btnTriagem = t?.closest?.('[data-acao="aceitar"],[data-acao="ignorar"],[data-acao="bloquear"],[data-acao="deletar"]');
        if (btnTriagem) {
            (async () => {
                const acao = btnTriagem.getAttribute('data-acao');
                const idx = Number(btnTriagem.getAttribute('data-idx'));
                const orc = Number.isFinite(idx) ? _orcamentosView[idx] : null;
                if (!orc) return;

                const rowId = getRowId(orc);
                if (rowId == null) {
                    alert('Não encontrei o campo de ID do orçamento. Verifique se a tabela tem uma coluna tipo id/orcamento_id.');
                    return;
                }

                if (acao === 'deletar') {
                    if (!confirm('Deseja DELETAR este orçamento? (ação irreversível)')) return;
                    await deletarOrcamento(rowId);
                    await carregarOrcamentos();
                    return;
                }

                const map = { aceitar: 'aceito', ignorar: 'ignorado', bloquear: 'bloqueado' };
                const novo = map[acao] || 'novo';
                await atualizarStatusOrcamento(rowId, novo);
                await carregarOrcamentos();
            })().catch(err => {
                alert(`Não foi possível executar a ação. Detalhe: ${err?.message || err}`);
            });
        }

        if (t?.id === 'modal-fechar' || t?.closest?.('#modal-fechar')) {
            fecharModal();
        }

        if (t?.id === 'admin-modal') {
            fecharModal();
        }

        if (t?.id === 'modal-copiar-email') {
            copiarTexto(document.getElementById('modal-email')?.textContent || '');
        }

        if (t?.id === 'modal-copiar-tel') {
            copiarTexto(document.getElementById('modal-tel')?.textContent || '');
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') fecharModal();
    });

    // Atualiza automaticamente quando chegar novo orçamento
    try {
        _orcamentosChannel = _supabase
            .channel('admin-orcamentos')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'orcamentos' },
                () => {
                    // debounce: evita várias recargas seguidas
                    if (_reloadTimer) clearTimeout(_reloadTimer);
                    _reloadTimer = setTimeout(() => carregarOrcamentos(), 350);
                }
            )
            .subscribe();
    } catch {
        // Se realtime não estiver habilitado, o botão "Recarregar" resolve.
    }

    carregarOrcamentos();
});