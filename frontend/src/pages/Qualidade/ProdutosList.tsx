import React, { useEffect, useState } from 'react';
import { Box, Button, Container, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { qualidadeService } from '../../services/api';
import toast from 'react-hot-toast';

interface Produto {
  id: string;
  codigo: string;
  nome: string;
  tipo: 'produto_acabado' | 'materia_prima';
  referencia_comercial?: string;
  descricao?: string;
}

const ProdutosList: React.FC = () => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Produto>>({ tipo: 'produto_acabado' });

  const carregar = async () => {
    try {
      const { data } = await qualidadeService.listarProdutos();
      setProdutos(data || []);
    } catch (e) {
      toast.error('Falha ao carregar produtos');
    }
  };

  useEffect(() => { carregar(); }, []);

  const salvar = async () => {
    try {
      await qualidadeService.criarProduto(form);
      setOpen(false);
      setForm({ tipo: 'produto_acabado' });
      await carregar();
      toast.success('Produto salvo');
    } catch (e) {
      toast.error('Falha ao salvar');
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h5">Produtos</Typography>
        <Button variant="contained" onClick={() => setOpen(true)}>Novo</Button>
      </Stack>

      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Código</TableCell>
              <TableCell>Nome</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Referência</TableCell>
              <TableCell>Descrição</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {produtos.map((p) => (
              <TableRow key={p.id} hover>
                <TableCell>{p.codigo}</TableCell>
                <TableCell>{p.nome}</TableCell>
                <TableCell>{p.tipo}</TableCell>
                <TableCell>{p.referencia_comercial}</TableCell>
                <TableCell>{p.descricao}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Novo Produto</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'grid', gap: 2, mt: 1 }}>
            <TextField label="Código" value={form.codigo || ''} onChange={(e) => setForm({ ...form, codigo: e.target.value })} />
            <TextField label="Nome" value={form.nome || ''} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            <TextField label="Tipo (produto_acabado/materia_prima)" value={form.tipo || ''} onChange={(e) => setForm({ ...form, tipo: e.target.value as any })} />
            <TextField label="Referência Comercial" value={form.referencia_comercial || ''} onChange={(e) => setForm({ ...form, referencia_comercial: e.target.value })} />
            <TextField label="Descrição" multiline rows={3} value={form.descricao || ''} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={salvar} variant="contained">Salvar</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ProdutosList;
