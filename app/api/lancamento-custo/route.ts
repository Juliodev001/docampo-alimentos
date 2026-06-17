import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const produtorId = searchParams.get("produtorId");
  const rocaId = searchParams.get("rocaId");
  const inicio = searchParams.get("inicio");
  const fim = searchParams.get("fim");

  const items = await prisma.lancamentoCusto.findMany({
    where: {
      ...(produtorId && { produtorId }),
      ...(rocaId && { rocaId }),
      ...(inicio &&
        fim && {
          data: { gte: new Date(inicio), lte: new Date(fim + "T23:59:59") },
        }),
    },
    orderBy: { data: "desc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const {
    data,
    produtorId,
    rocaId,
    combustivel,
    bandejaEmbalagem,
    valesDinheiro,
    creditos,
    debitosAnteriores,
    observacao,
  } = await req.json();

  try {
    const custo = await prisma.lancamentoCusto.create({
      data: {
        data: new Date(data),
        produtorId: produtorId || null,
        rocaId: rocaId || null,
        combustivel: combustivel ?? 0,
        bandejaEmbalagem: bandejaEmbalagem ?? 0,
        valesDinheiro: valesDinheiro ?? 0,
        creditos: creditos ?? 0,
        debitosAnteriores: debitosAnteriores ?? 0,
        observacao: observacao || null,
      },
    });
    return NextResponse.json(custo, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
