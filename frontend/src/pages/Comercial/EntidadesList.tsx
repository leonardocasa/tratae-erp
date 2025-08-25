import React, { useEffect, useState } from 'react';
import { Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { comercialService } from '../../services/api';
import { Add, Delete, Edit, Refresh } from '@mui/icons-material';

type Entidade = {
  id: string;
  documento_tipo: 'CNPJ'|'CPF';
  cnpj?: string | null;
  cpf?: string | null;
  razao_social: string;
  nome_fantasia?: string | null;
  email?: string | null;
  fone?: string | null;
  tipos: string[];
};

const TIPOS = ['emissora','cliente','fornecedor','transportadora'];

export default function EntidadesList() {
  const [items, setItems] = useState<Entidade[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState<string>('');

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ documento_tipo: 'CNPJ', tipos: [] });
  const [editId, setEditId] = useState<string | null>(null);

  const carregar = async () => {
    setLoading(true);
    try {
      const params = filtroTipo ? { tipo: filtroTipo } : undefined;
      const { data } = await comercialService.listarEntidades(params);
      setItems(data.entidades || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { carregar(); }, [filtroTipo]);

  const abrirNovo = () => { setEditId(null); setForm({ documento_tipo: 'CNPJ', tipos: [] }); setOpen(true); };
  const abrirEditar = (e: Entidade) => { setEditId(e.id); setForm({ ...e }); setOpen(true); };

  const salvar = async () => {
    const payload = { ...form, tipos: Array.isArray(form.tipos) ? form.tipos : [] };
    if (editId) await comercialService.atualizarEntidade(editId, payload); else await comercialService.criarEntidade(payload);
    setOpen(false); await carregar();
  };

  const excluir = async (id: string) => {
    await comercialService.excluirEntidade(id); await carregar();
  };

  return (
    <Box p={2}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h5">Entidades</Typography>
        <Stack direction="row" spacing={1}>
          <TextField select label="Filtrar por tipo" size="small" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} sx={{ minWidth: 220 }}>
            <MenuItem value="">Todos</MenuItem>
            {TIPOS.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </TextField>
          <IconButton onClick={carregar}><Refresh /></IconButton>
          <Button startIcon={<Add />} variant="contained" onClick={abrirNovo}>Novo</Button>
        </Stack>
      </Stack>

      <Grid container spacing={2}>
        {items.map((e) => (
          <Grid item xs={12} md={6} lg={4} key={e.id}>
            <Card>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography fontWeight={700}>{e.razao_social}</Typography>
                    <Typography variant="body2" color="text.secondary">{e.documento_tipo === 'CNPJ' ? e.cnpj : e.cpf}</Typography>
                    <Stack direction="row" spacing={1} mt={1}>
                      {e.tipos?.map(t => <Chip key={t} label={t} size="small" />)}
                    </Stack>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <IconButton onClick={() => abrirEditar(e)}><Edit /></IconButton>
                    <IconButton onClick={() => excluir(e.id)}><Delete /></IconButton>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? 'Editar Entidade' : 'Nova Entidade'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField select label="Documento" value={form.documento_tipo} onChange={(e) => setForm({ ...form, documento_tipo: e.target.value, cnpj: '', cpf: '' })}>
              <MenuItem value="CNPJ">CNPJ</MenuItem>
              <MenuItem value="CPF">CPF</MenuItem>
            </TextField>
            {form.documento_tipo === 'CNPJ' ? (
              <TextField label="CNPJ" value={form.cnpj || ''} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} />
            ) : (
              <TextField label="CPF" value={form.cpf || ''} onChange={(e) => setForm({ ...form, cpf: e.target.value })} />
            )}
            <TextField label="Razão Social / Nome" value={form.razao_social || ''} onChange={(e) => setForm({ ...form, razao_social: e.target.value })} />
            <TextField label="Nome Fantasia" value={form.nome_fantasia || ''} onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })} />
            <TextField label="Email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <TextField label="Fone" value={form.fone || ''} onChange={(e) => setForm({ ...form, fone: e.target.value })} />
            <TextField select label="Tipos" SelectProps={{ multiple: true }} value={form.tipos || []} onChange={(e) => setForm({ ...form, tipos: Array.from(e.target.value as any) })}>
              {TIPOS.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={salvar}>{editId ? 'Salvar' : 'Criar'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
