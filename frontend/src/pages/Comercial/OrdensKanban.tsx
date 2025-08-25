import React, { useEffect, useMemo, useState } from 'react';
import { Box, Button, Card, CardContent, CircularProgress, Grid, Stack, TextField, Typography } from '@mui/material';
import { comercialService } from '../../services/api';

type Ordem = {
  id: string;
  emissora_id: string;
  cliente_id?: string | null;
  transportadora_id?: string | null;
  produto: string;
  referencia?: string | null;
  observacao?: string | null;
  quantidade: number;
  unidade: string;
  embalagem?: string | null;
  status: 'rascunho'|'em_separacao'|'pronto'|'coleta_solicitada'|'coletado'|'cancelado';
};

const COLUNAS: { key: Ordem['status']; title: string }[] = [
  { key: 'rascunho', title: 'Rascunho' },
  { key: 'em_separacao', title: 'Em separação' },
  { key: 'pronto', title: 'Pronto' },
  { key: 'coleta_solicitada', title: 'Coleta Solicitada' },
  { key: 'coletado', title: 'Coletado' },
  { key: 'cancelado', title: 'Cancelado' },
];

export default function OrdensKanban() {
  const [loading, setLoading] = useState(true);
  const [ordens, setOrdens] = useState<Ordem[]>([]);

  const [novo, setNovo] = useState({
    emissora_id: '',
    cliente_id: '',
    transportadora_id: '',
    produto: '',
    referencia: '',
    quantidade: '1',
    unidade: 'ton',
    embalagem: '',
  });

  const grouped = useMemo(() => {
    const map: Record<Ordem['status'], Ordem[]> = {
      rascunho: [], em_separacao: [], pronto: [], coleta_solicitada: [], coletado: [], cancelado: []
    };
    ordens.forEach(o => map[o.status].push(o));
    return map;
  }, [ordens]);

  const carregar = async () => {
    setLoading(true);
    try {
      const { data } = await comercialService.listarOrdensColeta();
      setOrdens(data.ordens || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const criar = async () => {
    setLoading(true);
    try {
      await comercialService.criarOrdemColeta({
        emissora_id: novo.emissora_id || undefined,
        cliente_id: novo.cliente_id || undefined,
        transportadora_id: novo.transportadora_id || undefined,
        produto: novo.produto,
        referencia: novo.referencia || undefined,
        quantidade: Number(novo.quantidade || '0'),
        unidade: novo.unidade || 'ton',
        embalagem: novo.embalagem || undefined,
      });
      setNovo({ emissora_id: '', cliente_id: '', transportadora_id: '', produto: '', referencia: '', quantidade: '1', unidade: 'ton', embalagem: '' });
      await carregar();
    } finally { setLoading(false); }
  };

  const mover = async (id: string, status: Ordem['status']) => {
    await comercialService.atualizarStatus(id, status);
    await carregar();
  };

  return (
    <Box p={2}>
      <Typography variant="h5" mb={2}>Ordens de Coleta</Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
            <TextField label="Emissora ID" value={novo.emissora_id} onChange={(e) => setNovo({ ...novo, emissora_id: e.target.value })} size="small" />
            <TextField label="Cliente ID" value={novo.cliente_id} onChange={(e) => setNovo({ ...novo, cliente_id: e.target.value })} size="small" />
            <TextField label="Transportadora ID" value={novo.transportadora_id} onChange={(e) => setNovo({ ...novo, transportadora_id: e.target.value })} size="small" />
            <TextField label="Produto" value={novo.produto} onChange={(e) => setNovo({ ...novo, produto: e.target.value })} size="small" required />
            <TextField label="Ref." value={novo.referencia} onChange={(e) => setNovo({ ...novo, referencia: e.target.value })} size="small" />
            <TextField label="Qtd" value={novo.quantidade} onChange={(e) => setNovo({ ...novo, quantidade: e.target.value })} size="small" sx={{ width: 100 }} />
            <TextField label="Unid" value={novo.unidade} onChange={(e) => setNovo({ ...novo, unidade: e.target.value })} size="small" sx={{ width: 90 }} />
            <TextField label="Embalagem" value={novo.embalagem} onChange={(e) => setNovo({ ...novo, embalagem: e.target.value })} size="small" />
            <Button variant="contained" onClick={criar}>Criar</Button>
          </Stack>
        </CardContent>
      </Card>

      {loading ? (
        <Stack alignItems="center" mt={4}><CircularProgress /></Stack>
      ) : (
        <Grid container spacing={2}>
          {COLUNAS.map(col => (
            <Grid item xs={12} md={6} lg={4} key={col.key}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={700} mb={1}>{col.title} ({grouped[col.key].length})</Typography>
                  <Stack spacing={1}>
                    {grouped[col.key].map((o) => (
                      <Card key={o.id} variant="outlined">
                        <CardContent>
                          <Typography fontWeight={700}>{o.produto}</Typography>
                          <Typography variant="body2">Ref: {o.referencia || '-'}</Typography>
                          <Typography variant="body2">Qtd: {o.quantidade} {o.unidade}</Typography>
                          <Stack direction="row" spacing={1} mt={1}>
                            {COLUNAS.filter(c => c.key !== o.status).map(btn => (
                              <Button key={btn.key} size="small" onClick={() => mover(o.id, btn.key)}>{btn.title}</Button>
                            ))}
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}


