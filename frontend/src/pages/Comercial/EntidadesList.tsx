import React, { useEffect, useMemo, useState } from 'react';
import { Container, Paper, Stack, Typography, Button, Table, TableHead, TableRow, TableCell, TableBody, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Chip, IconButton, Tooltip, TableSortLabel, TablePagination } from '@mui/material';
import { comercialService, cnpjService } from '../../services/api';
import toast from 'react-hot-toast';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';

interface Entidade {
  id: string;
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string;
  tipo: 'cliente' | 'fornecedor' | 'transportadora' | 'emissora';
  empresa_emissora?: boolean;
}

type Order = 'asc' | 'desc';

function onlyDigits(value: string) { return (value || '').replace(/\D/g, ''); }
function maskCNPJ(value: string) {
  const v = onlyDigits(value).slice(0, 14);
  return v
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}
function isValidCNPJ(cnpj: string) {
  let v = onlyDigits(cnpj);
  if (v.length !== 14) return false;
  // Eliminar sequências iguais
  if (/^(\d)\1+$/.test(v)) return false;
  let tamanho = v.length - 2, numeros = v.substring(0, tamanho), digitos = v.substring(tamanho), soma = 0, pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) { soma += Number(numeros.charAt(tamanho - i)) * pos--; if (pos < 2) pos = 9; }
  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11); if (resultado !== Number(digitos.charAt(0))) return false;
  tamanho = tamanho + 1; numeros = v.substring(0, tamanho); soma = 0; pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) { soma += Number(numeros.charAt(tamanho - i)) * pos--; if (pos < 2) pos = 9; }
  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11); return resultado === Number(digitos.charAt(1));
}

const EntidadesList: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<Entidade[]>([]);
  const [open, setOpen] = useState(false);
  const [tipoFiltro, setTipoFiltro] = useState<string>('');
  const [form, setForm] = useState<any>({ tipo: 'cliente', empresa_emissora: false });
  const [loadingCnpj, setLoadingCnpj] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [orderBy, setOrderBy] = useState<keyof Entidade>('razao_social');
  const [order, setOrder] = useState<Order>('asc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [cnpjExists, setCnpjExists] = useState<boolean | null>(null);

  const carregar = async () => {
    try {
      const { data } = await comercialService.listarEntidades({ tipo: tipoFiltro || undefined });
      setItems(data.entidades || []);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Falha ao carregar entidades');
    }
  };

  useEffect(() => { carregar(); }, [tipoFiltro]);

  // Checagem de duplicidade de CNPJ em tempo real
  useEffect(() => {
    const cnpj = onlyDigits(form.cnpj || '');
    if (!cnpj || cnpj.length < 14) { setCnpjExists(null); return; }
    const timer = setTimeout(async () => {
      try {
        const { data } = await comercialService.listarEntidades({ cnpj });
        setCnpjExists((data.entidades || []).length > 0);
      } catch { setCnpjExists(null); }
    }, 400);
    return () => clearTimeout(timer);
  }, [form.cnpj]);

  const buscarCnpj = async () => {
    const cnpj = onlyDigits(form.cnpj || '');
    if (!cnpj) { toast.error('Informe um CNPJ'); return; }
    if (!isValidCNPJ(cnpj)) { toast.error('CNPJ inválido'); return; }
    try {
      setLoadingCnpj(true);
      const { data } = await cnpjService.consultar(cnpj);
      const dados = data?.dados || data;
      setForm((prev: any) => ({
        ...prev,
        cnpj: maskCNPJ(cnpj),
        razao_social: dados?.razao_social || dados?.nome || prev.razao_social,
        nome_fantasia: dados?.nome_fantasia || dados?.fantasia || prev.nome_fantasia,
        endereco: {
          logradouro: dados?.logradouro || dados?.endereco,
          numero: dados?.numero,
          bairro: dados?.bairro,
          cidade: dados?.municipio || dados?.cidade,
          uf: dados?.uf,
          cep: dados?.cep,
        },
        contato: { telefone: dados?.telefone, email: dados?.email },
      }));
      toast.success('Dados do CNPJ carregados');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Não foi possível consultar o CNPJ');
    } finally { setLoadingCnpj(false); }
  };

  const salvar = async () => {
    try {
      const cnpj = onlyDigits(form.cnpj || '');
      if (!isValidCNPJ(cnpj)) { toast.error('CNPJ inválido'); return; }
      const payload = { ...form, cnpj };
      if (editingId) await comercialService.atualizarEntidade(editingId, payload);
      else await comercialService.criarEntidade(payload);
      setOpen(false); setEditingId(null);
      setForm({ tipo: 'cliente', empresa_emissora: false });
      await carregar();
      toast.success('Entidade salva');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Falha ao salvar');
    }
  };

  const editar = (e: Entidade) => {
    setEditingId(e.id);
    setForm({ ...e, cnpj: maskCNPJ(e.cnpj) });
    setOpen(true);
  };

  const excluir = async (id: string) => {
    if (!confirm('Deseja realmente excluir a entidade?')) return;
    try { await comercialService.excluirEntidade(id); await carregar(); toast.success('Entidade excluída'); }
    catch (e: any) { toast.error(e?.response?.data?.error || 'Falha ao excluir'); }
  };

  const handleRequestSort = (property: keyof Entidade) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const sorted = useMemo(() => {
    const data = [...items];
    data.sort((a: any, b: any) => {
      const aVal = (a[orderBy] ?? '').toString().toLowerCase();
      const bVal = (b[orderBy] ?? '').toString().toLowerCase();
      if (aVal < bVal) return order === 'asc' ? -1 : 1;
      if (aVal > bVal) return order === 'asc' ? 1 : -1;
      return 0;
    });
    return data;
  }, [items, orderBy, order]);

  const paginated = useMemo(() => {
    const start = page * rowsPerPage;
    return sorted.slice(start, start + rowsPerPage);
  }, [sorted, page, rowsPerPage]);

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="Voltar ao início"><IconButton onClick={() => navigate('/dashboard')}><ArrowBackIcon /></IconButton></Tooltip>
          <Typography variant="h5">Entidades</Typography>
        </Stack>
        <Stack direction="row" spacing={2}>
          <TextField select size="small" label="Filtrar por tipo" value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)}>
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="cliente">Clientes</MenuItem>
            <MenuItem value="fornecedor">Fornecedores</MenuItem>
            <MenuItem value="transportadora">Transportadoras</MenuItem>
            <MenuItem value="emissora">Emissoras</MenuItem>
          </TextField>
          <Button variant="contained" onClick={() => { setEditingId(null); setForm({ tipo: 'cliente', empresa_emissora: false }); setOpen(true); }}>Nova Entidade</Button>
        </Stack>
      </Stack>

      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sortDirection={orderBy==='tipo'?order:false}>
                <TableSortLabel active={orderBy==='tipo'} direction={order} onClick={() => handleRequestSort('tipo')}>Tipo</TableSortLabel>
              </TableCell>
              <TableCell>CNPJ</TableCell>
              <TableCell sortDirection={orderBy==='razao_social'?order:false}>
                <TableSortLabel active={orderBy==='razao_social'} direction={order} onClick={() => handleRequestSort('razao_social')}>Razão Social</TableSortLabel>
              </TableCell>
              <TableCell>Nome Fantasia</TableCell>
              <TableCell>Empresa Emissora</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginated.map((e) => (
              <TableRow key={e.id} hover>
                <TableCell sx={{ textTransform: 'capitalize' }}>{e.tipo}</TableCell>
                <TableCell>{maskCNPJ(e.cnpj)}</TableCell>
                <TableCell>{e.razao_social}</TableCell>
                <TableCell>{e.nome_fantasia}</TableCell>
                <TableCell>{e.empresa_emissora || e.tipo === 'emissora' ? <Chip label="Sim" color="success" size="small" /> : <Chip label="Não" size="small" />}</TableCell>
                <TableCell align="right">
                  <Tooltip title="Editar"><IconButton onClick={() => editar(e)} size="small"><EditIcon fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title="Excluir"><IconButton onClick={() => excluir(e.id)} size="small" color="error"><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination component="div" count={items.length} page={page} onPageChange={(_,p)=>setPage(p)} rowsPerPage={rowsPerPage} onRowsPerPageChange={(e)=>{setRowsPerPage(parseInt(e.target.value,10)); setPage(0);}} rowsPerPageOptions={[5,10,25]} />
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingId ? 'Editar Entidade' : 'Nova Entidade'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField label="CNPJ" fullWidth value={form.cnpj || ''} onChange={(e) => setForm({ ...form, cnpj: maskCNPJ(e.target.value) })} helperText={cnpjExists? 'CNPJ já cadastrado' : ' '} error={cnpjExists===true} />
              <Tooltip title="Buscar dados do CNPJ">
                <span>
                  <IconButton onClick={buscarCnpj} disabled={loadingCnpj}>
                    <SearchIcon />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
            <TextField label="Razão Social" value={form.razao_social || ''} onChange={(e) => setForm({ ...form, razao_social: e.target.value })} />
            <TextField label="Nome Fantasia" value={form.nome_fantasia || ''} onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })} />
            <TextField select label="Tipo" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              <MenuItem value="cliente">Cliente</MenuItem>
              <MenuItem value="fornecedor">Fornecedor</MenuItem>
              <MenuItem value="transportadora">Transportadora</MenuItem>
              <MenuItem value="emissora">Emissora</MenuItem>
            </TextField>
            <TextField select label="Empresa Emissora" value={form.empresa_emissora ? 'sim' : 'nao'} onChange={(e) => setForm({ ...form, empresa_emissora: e.target.value === 'sim' })}>
              <MenuItem value="nao">Não</MenuItem>
              <MenuItem value="sim">Sim</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={salvar} variant="contained" disabled={cnpjExists===true}>Salvar</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default EntidadesList;
