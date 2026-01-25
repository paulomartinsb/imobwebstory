export interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

export const searchCep = async (cep: string): Promise<ViaCepResponse | null> => {
  try {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      return null;
    }

    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    const data = await response.json();

    if (data.erro) {
      return null;
    }

    return data;
  } catch (error) {
    console.error("Erro ao buscar CEP:", error);
    return null;
  }
};