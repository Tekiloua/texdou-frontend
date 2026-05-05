import axios from "axios"

const server_url = "http://localhost:8000"

export const fetchCategories = async () => {
  const response = await axios.get(`${server_url}/categories`)
  return response.data
}

export const fetchDocuments = async () => {
  const response = await axios.get(`${server_url}/documents`)
  return response.data
}

export const fetchHistoriques = async () => {
  const response = await axios.get(`${server_url}/historiques`)
  return response.data
}

export const fetcLiensUtiles = async () => {
  const response = await axios.get(`${server_url}/liens-utiles`)
  return response.data
}

export const fetchStatuts = async () => {
  const response = await axios.get(`${server_url}/statuts`)
  return response.data
}

export const fetchTextes = async () => {
  const response = await axios.get(`${server_url}/textes`)
  return response.data
}

export const fetchTexteById = async (id: string) => {
  const response = await axios.get(`${server_url}/textes/${id}`)
  return response.data
}

export const fetchTextesDocuments = async () => {
  const response = await axios.get(`${server_url}/textes-documents`)
  return response.data
}

export const fetchTextesReferences = async () => {
  const response = await axios.get(`${server_url}/textes-references`)
  return response.data
}

export const fetchTextesThemes = async () => {
  const response = await axios.get(`${server_url}/textes-themes`)
  return response.data
}

export const fetchThemes = async () => {
  const response = await axios.get(`${server_url}/themes`)
  return response.data
}
