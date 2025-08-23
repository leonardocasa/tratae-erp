import React, { useEffect, useState } from 'react';
import { Box, Button, Container, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { qualidadeService } from '../../services/api';
import toast from 'react-hot-toast';

interface Caracteristica {
  id: string;
  descricao: string;
  procedimento_analise: string;
}

const CaracteristicasList: React.FC = () => {
  const [items, setItems] = useState<Caracteristica[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Caracteristica>>({});

  const carregar = async () => {
    try {
      const { data } = await qualidadeService.listarCaracteristicas();
      setItems(data || []);
    } catch (e) {
      toast.error('Falha ao carregar características');
    }
  };

  useEffect(() => { carregar(); }, []);

  const salvar = async () => {
    try {
      await qualidadeService.criarCaracteristica(form);
      setOpen(false);
      setForm({});
      await carregar();
      toast.success('Característica salva');
    } catch (e) {
      toast.error('Falha ao salvar');
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h5">Características Físico-Químicas</Typography>
        <Button variant="contained" onClick={() => setOpen(true)}>Nova</Button>
      </Stack>

      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Descrição</TableCell>
              <TableCell>Procedimento</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((c) => (
              <TableRow key={c.id} hover>
                <TableCell>{c.descricao}</TableCell>
                <TableCell>{c.procedimento_analise}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Nova Característica</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'grid', gap: 2, mt: 1 }}>
            <TextField label="Descrição" value={form.descricao || ''} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
            <TextField label="Procedimento de Análise" multiline rows={3} value={form.procedimento_analise || ''} onChange={(e) => setForm({ ...form, procedimento_analise: e.target.value })} />
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

export default CaracteristicasList;
