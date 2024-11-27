import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreateProdutoDto } from './dto/create-produto.dto';
import { UpdateProdutoDto } from './dto/update-produto.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { CompraProdutoDto } from './dto/compra-produto.dto';
import { VendaProdutoDto } from './dto/venda-produto.dto';
import { Operacao, Produto } from '@prisma/client';

@Injectable()
export class ProdutoService {
  constructor(private prisma: PrismaService) {}

  async buscarTodos(): Promise<Produto[]> {
    //método que retorna todos os produtos com status ativo (true)
    const produtos = await this.prisma.produto.findMany({ where: { status: true } });
    if (!produtos) throw new InternalServerErrorException('Não foi possível buscar os produtos.');
    return produtos;
  }

  async criar(createProdutoDto: CreateProdutoDto): Promise<Produto> {
    try {
      const produto = await this.prisma.produto.create({ data: createProdutoDto });
      return produto;
    } catch (error) {
      throw new InternalServerErrorException('Erro ao criar produto.');
    }
  }

  async buscarPorId(id: number): Promise<Produto> {
    try {
      const produto = await this.prisma.produto.findUnique({
        where: { id },
        include: { operacoes: true },
      });
      if (!produto) throw new BadRequestException('Produto não encontrado.');
      return produto;
    } catch (error) {
      throw new InternalServerErrorException('Erro ao buscar produto pelo ID.');
    }
  }
  

  async atualizar(id: number, updateProdutoDto: UpdateProdutoDto): Promise<Produto> {
    try {
      const produto = await this.prisma.produto.update({
        where: { id },
        data: updateProdutoDto,
      });
      return produto;
    } catch (error) {
      throw new InternalServerErrorException('Erro ao atualizar produto.');
    }
  }

  async desativar(id: number): Promise<Produto> {
    try {
      const produto = await this.prisma.produto.update({
        where: { id },
        data: { status: false },
      });
      return produto;
    } catch (error) {
      throw new InternalServerErrorException('Erro ao desativar produto.');
    }
  }

  async comprarProdutos(id: number, compraProdutoDto: CompraProdutoDto): Promise<Operacao> {
    const { preco, quantidade } = compraProdutoDto;
  
    try {
      const produto = await this.prisma.produto.findUnique({ where: { id } });
      if (!produto) throw new BadRequestException('Produto não encontrado.');
  
      const precoVendaAtualizado = Math.max(produto.precoVenda, preco * 1.5);
      const operacao = await this.prisma.operacao.create({
        data: {
          produtoId: id,
          tipo: 1,
          preco,
          quantidade,
          total: preco * quantidade,
        },
      });
  
      await this.prisma.produto.update({
        where: { id },
        data: {
          precoCompra: preco,
          precoVenda: precoVendaAtualizado,
          quantidade: produto.quantidade + quantidade,
        },
      });
  
      return operacao;
    } catch (error) {
      throw new InternalServerErrorException('Erro ao realizar compra.');
    }
  }

  async venderProdutos(id: number, vendaProduto: VendaProdutoDto): Promise<Operacao> {
    const { preco, quantidade } = vendaProduto;
  
    try {
      const produto = await this.prisma.produto.findUnique({ where: { id } });
      if (!produto) throw new BadRequestException('Produto não encontrado.');
      if (produto.quantidade < quantidade) throw new BadRequestException('Quantidade insuficiente.');
  
      const novaQuantidade = produto.quantidade - quantidade;
      const operacao = await this.prisma.operacao.create({
        data: {
          produtoId: id,
          tipo: 2,
          preco,
          quantidade,
          total: preco * quantidade,
        },
      });
  
      await this.prisma.produto.update({
        where: { id },
        data: {
          quantidade: novaQuantidade,
          precoCompra: novaQuantidade === 0 ? 0 : produto.precoCompra,
          precoVenda: novaQuantidade === 0 ? 0 : produto.precoVenda,
        },
      });
  
      return operacao;
    } catch (error) {
      throw new InternalServerErrorException('Erro ao realizar venda.');
    }
  }
}  
