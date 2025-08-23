import React, { useEffect, useState } from 'react';
import { Container, Paper, Stack, Typography, Button, Table, TableHead, TableRow, TableCell, TableBody, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Chip } from '@mui/material';
import { comercialService, qualidadeService } from '../../services/api';
import toast from 'react-hot-toast';

interface OrdemColeta {
  id: string;
  status: 'aberta' | 'em_separacao' | 'pronto_coleta' | 'aguardando_nf' | 'finalizada';
  quantidade: number;
  empresa_emissora?: any;
  transportadora?: any;
  produto?: any;
  created_at: string;
}

const OrdensColetaList: React.FC = () => {
  const [items, setItems] = useState<OrdemColeta[]>([]);
  const [open, setOpen] = useState(false);
  const [statusFiltro, setStatusFiltro] = useState<string>('');
  const [form, setForm] = useState<any>({});
  const [produtos, setProdutos] = useState<any[]>([]);
  const [entidades, setEntidades] = useState<any[]>([]);

  const carregar = async () => {
    try {
      const { data } = await comercialService.listarOrdensColeta({ status: statusFiltro || undefined });
      setItems(data.ordens || []);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Falha ao carregar ordens');
    }
  };

  const carregarAuxiliares = async () => {
    try {
      const [p, e] = await Promise.all([
        qualidadeService.listarProdutos(),
        comercialService.listarEntidades(),
      ]);
      const listaProdutos = Array.isArray(p.data)
        ? p.data
        : Array.isArray((p.data as any)?.produtos)
        ? (p.data as any).produtos
        : [];
      setProdutos(listaProdutos);
      setEntidades(e.data.entidades || []);
    } catch {}
  };

  useEffect(() => { carregar(); }, [statusFiltro]);
  useEffect(() => { carregarAuxiliares(); }, []);

  const salvar = async () => {
    try {
      await comercialService.criarOrdemColeta(form);
      setOpen(false);
      setForm({});
      await carregar();
      toast.success('Ordem criada');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Falha ao salvar');
    }
  };

  const atualizarStatus = async (id: string, status: string) => {
    try {
      await comercialService.atualizarStatus(id, status);
      await carregar();
      toast.success('Status atualizado');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Falha ao atualizar status');
    }
  };

  const statusCores: Record<string, any> = {
    aberta: 'default',
    em_separacao: 'warning',
    pronto_coleta: 'info',
    aguardando_nf: 'secondary',
    finalizada: 'success'
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5">Ordens de Coleta</Typography>
        <Stack direction="row" spacing={2}>
          <TextField select size="small" label="Filtrar por status" value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value)}>
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="aberta">Aberta</MenuItem>
            <MenuItem value="em_separacao">Em Separação</MenuItem>
            <MenuItem value="pronto_coleta">Pronto para Coleta</MenuItem>
            <MenuItem value="aguardando_nf">Aguardando NF</MenuItem>
            <MenuItem value="finalizada">Finalizada</MenuItem>
          </TextField>
          <Button variant="contained" onClick={() => setOpen(true)}>Nova Ordem</Button>
        </Stack>
      </Stack>

      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Data</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Empresa Emissora</TableCell>
              <TableCell>Transportadora</TableCell>
              <TableCell>Produto</TableCell>
              <TableCell>Qtd</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((o) => (
              <TableRow key={o.id} hover>
                <TableCell>{new Date(o.created_at).toLocaleString()}</TableCell>
                <TableCell><Chip label={o.status.replace('_', ' ')} color={statusCores[o.status]} size="small" /></TableCell>
                <TableCell>{o.empresa_emissora?.razao_social}</TableCell>
                <TableCell>{o.transportadora?.razao_social}</TableCell>
                <TableCell>{o.produto?.nome}</TableCell>
                <TableCell>{o.quantidade}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1}>
                    <Button size="small" onClick={() => atualizarStatus(o.id, 'em_separacao')}>Separação</Button>
                    <Button size="small" onClick={() => atualizarStatus(o.id, 'pronto_coleta')}>Pronto</Button>
                    <Button size="small" onClick={() => atualizarStatus(o.id, 'aguardando_nf')}>Aguard. NF</Button>
                    <Button size="small" onClick={() => atualizarStatus(o.id, 'finalizada')}>Finalizar</Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Nova Ordem de Coleta</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <TextField select label="Empresa Emissora" value={form.empresa_emissora_id || ''} onChange={(e) => setForm({ ...form, empresa_emissora_id: e.target.value })}>
              {entidades.filter((x) => x.empresa_emissora).map((e) => (
                <MenuItem key={e.id} value={e.id}>{e.razao_social}</MenuItem>
              ))}
            </TextField>
            <TextField select label="Produto" value={form.produto_id || ''} onChange={(e) => setForm({ ...form, produto_id: e.target.value })}>
              {produtos.map((p: any) => (
                <MenuItem key={p.id} value={p.id}>{p.nome}</MenuItem>
              ))}
            </TextField>
            <TextField label="Quantidade" type="number" value={form.quantidade || ''} onChange={(e) => setForm({ ...form, quantidade: Number(e.target.value) })} />
            <TextField label="Tipo de Embalagem" value={form.tipo_embalagem || ''} onChange={(e) => setForm({ ...form, tipo_embalagem: e.target.value })} />
            <TextField select label="Transportadora" value={form.transportadora_id || ''} onChange={(e) => setForm({ ...form, transportadora_id: e.target.value })}>
              {entidades.filter((x) => x.tipo === 'transportadora').map((e) => (
                <MenuItem key={e.id} value={e.id}>{e.razao_social}</MenuItem>
              ))}
            </TextField>
            <TextField label="Observações" multiline rows={3} value={form.observacoes || ''} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
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

export default OrdensColetaList;
