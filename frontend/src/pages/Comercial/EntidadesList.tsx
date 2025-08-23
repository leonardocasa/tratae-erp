import React, { useEffect, useState } from 'react';
import { Container, Paper, Stack, Typography, Button, Table, TableHead, TableRow, TableCell, TableBody, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Chip } from '@mui/material';
import { comercialService } from '../../services/api';
import toast from 'react-hot-toast';

interface Entidade {
  id: string;
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string;
  tipo: 'cliente' | 'fornecedor' | 'transportadora';
  empresa_emissora?: boolean;
}

const EntidadesList: React.FC = () => {
  const [items, setItems] = useState<Entidade[]>([]);
  const [open, setOpen] = useState(false);
  const [tipoFiltro, setTipoFiltro] = useState<string>('');
  const [form, setForm] = useState<any>({ tipo: 'cliente', empresa_emissora: false });

  const carregar = async () => {
    try {
      const { data } = await comercialService.listarEntidades({ tipo: tipoFiltro || undefined });
      setItems(data.entidades || []);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Falha ao carregar entidades');
    }
  };

  useEffect(() => { carregar(); }, [tipoFiltro]);

  const salvar = async () => {
    try {
      await comercialService.criarEntidade(form);
      setOpen(false);
      setForm({ tipo: 'cliente', empresa_emissora: false });
      await carregar();
      toast.success('Entidade salva');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Falha ao salvar');
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5">Entidades</Typography>
        <Stack direction="row" spacing={2}>
          <TextField select size="small" label="Filtrar por tipo" value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)}>
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="cliente">Clientes</MenuItem>
            <MenuItem value="fornecedor">Fornecedores</MenuItem>
            <MenuItem value="transportadora">Transportadoras</MenuItem>
          </TextField>
          <Button variant="contained" onClick={() => setOpen(true)}>Nova Entidade</Button>
        </Stack>
      </Stack>

      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Tipo</TableCell>
              <TableCell>CNPJ</TableCell>
              <TableCell>Razão Social</TableCell>
              <TableCell>Nome Fantasia</TableCell>
              <TableCell>Empresa Emissora</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((e) => (
              <TableRow key={e.id} hover>
                <TableCell sx={{ textTransform: 'capitalize' }}>{e.tipo}</TableCell>
                <TableCell>{e.cnpj}</TableCell>
                <TableCell>{e.razao_social}</TableCell>
                <TableCell>{e.nome_fantasia}</TableCell>
                <TableCell>{e.empresa_emissora ? <Chip label="Sim" color="success" size="small" /> : <Chip label="Não" size="small" />}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Nova Entidade</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <TextField label="CNPJ" value={form.cnpj || ''} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} />
            <TextField label="Razão Social" value={form.razao_social || ''} onChange={(e) => setForm({ ...form, razao_social: e.target.value })} />
            <TextField label="Nome Fantasia" value={form.nome_fantasia || ''} onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })} />
            <TextField select label="Tipo" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              <MenuItem value="cliente">Cliente</MenuItem>
              <MenuItem value="fornecedor">Fornecedor</MenuItem>
              <MenuItem value="transportadora">Transportadora</MenuItem>
            </TextField>
            <TextField select label="Empresa Emissora" value={form.empresa_emissora ? 'sim' : 'nao'} onChange={(e) => setForm({ ...form, empresa_emissora: e.target.value === 'sim' })}>
              <MenuItem value="nao">Não</MenuItem>
              <MenuItem value="sim">Sim</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={salvar} variant="contained">Salvar</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default EntidadesList;
