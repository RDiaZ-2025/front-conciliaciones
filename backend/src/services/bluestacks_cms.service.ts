import axios from 'axios';
import { NewsArticleData, NewsBlock } from './noc_news_scheduler.service';

export interface BluestacksConfig {
    cmdUrl: string;
    username: string;
    password: string;
    site: string;
    publication: string;
    securityToken: string;
    publicUrl: string;
}

export class BluestacksCmsService {
    private config: BluestacksConfig;
    private cachedToken: string | null = null;
    private tokenExpiry: number = 0;

    constructor() {
        const cmdUrl = process.env.BLUESTACK_CMD_URL?.trim();
        if (!cmdUrl) {
            throw new Error('La variable de entorno BLUESTACK_CMD_URL es requerida y no está configurada o es inválida.');
        }

        const username = process.env.BLUESTACK_USERNAME?.trim();
        if (!username) {
            throw new Error('La variable de entorno BLUESTACK_USERNAME es requerida y no está configurada o es inválida.');
        }

        const password = process.env.BLUESTACK_PASSWORD?.trim();
        if (!password) {
            throw new Error('La variable de entorno BLUESTACK_PASSWORD es requerida y no está configurada o es inválida.');
        }

        const site = process.env.BLUESTACK_SITE?.trim();
        if (!site) {
            throw new Error('La variable de entorno BLUESTACK_SITE es requerida y no está configurada o es inválida.');
        }

        const publication = process.env.BLUESTACK_PUBLICATION?.trim();
        if (!publication) {
            throw new Error('La variable de entorno BLUESTACK_PUBLICATION es requerida y no está configurada o es inválida.');
        }

        const securityToken = process.env.BLUESTACK_SECURITY_TOKEN?.trim();
        if (!securityToken) {
            throw new Error('La variable de entorno BLUESTACK_SECURITY_TOKEN es requerida y no está configurada o es inválida.');
        }

        const publicUrl = process.env.BLUESTACK_PUBLIC_URL?.trim();
        if (!publicUrl) {
            throw new Error('La variable de entorno BLUESTACK_PUBLIC_URL es requerida y no está configurada o es inválida.');
        }

        const cleanCmd = cmdUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '');

        this.config = {
            cmdUrl: cleanCmd,
            username,
            password,
            site,
            publication,
            securityToken,
            publicUrl: publicUrl.replace(/\/+$/, '')
        };

        console.log(`🔧 [Bluestacks CMS] Configuración inicializada:`, JSON.stringify({
            cmdUrl: this.config.cmdUrl,
            username: this.config.username,
            site: this.config.site,
            publication: this.config.publication,
            publicUrl: this.config.publicUrl
        }));
    }

    async login(): Promise<string> {
        if (this.cachedToken && Date.now() < this.tokenExpiry) {
            console.log(`🔑 [Bluestacks CMS][Login] Usando token en caché vigente.`);
            return this.cachedToken;
        }

        const loginUrl = `https://${this.config.cmdUrl}/system/modules/com.tfsla.diario.base/templates/webservices/authorizationService.jsp`;
        const requestParams = {
            username: this.config.username,
            password: this.config.password,
            site: this.config.site,
            publication: this.config.publication
        };
        const requestHeaders = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'x-security-token': this.config.securityToken
        };

        console.log(`📤 [Bluestacks CMS][Login] REQUEST:`, JSON.stringify({
            method: 'GET',
            url: loginUrl,
            params: {
                username: requestParams.username,
                password: '***',
                site: requestParams.site,
                publication: requestParams.publication
            },
            headers: {
                'Content-Type': requestHeaders['Content-Type'],
                'x-security-token': '***'
            }
        }, null, 2));

        const startTime = Date.now();
        try {
            const response = await axios.get(loginUrl, {
                params: requestParams,
                headers: requestHeaders,
                timeout: 30000
            });
            const durationMs = Date.now() - startTime;

            console.log(`📥 [Bluestacks CMS][Login] RESPONSE (${durationMs}ms) Status ${response.status}:`, JSON.stringify(response.data, null, 2));

            if (response.data && response.data.token) {
                const tokenStr = String(response.data.token);
                this.cachedToken = tokenStr;
                this.tokenExpiry = Date.now() + 10 * 60 * 1000;
                console.log(`✅ [Bluestacks CMS][Login] Autenticación exitosa.`);
                return tokenStr;
            }

            throw new Error(`Respuesta de login sin token válido: ${JSON.stringify(response.data)}`);
        } catch (error: any) {
            const durationMs = Date.now() - startTime;
            console.error(`❌ [Bluestacks CMS][Login] ERROR (${durationMs}ms):`, JSON.stringify({
                message: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                responseHeaders: error.response?.headers,
                responseData: error.response?.data
            }, null, 2));
            throw new Error(`Error autenticando en Bluestacks CMS: ${error.message} | Respuesta: ${JSON.stringify(error.response?.data || {})}`);
        }
    }

    async uploadImage(imageUrl: string, fileName: string, description: string, title: string): Promise<string> {
        const token = await this.login();
        const startTime = Date.now();

        try {
            console.log(`📤 [Bluestacks CMS][UploadImage] Descargando imagen origen:`, JSON.stringify({
                sourceUrl: imageUrl,
                targetFileName: fileName,
                title,
                description
            }, null, 2));

            const imageResponse = await axios.get(imageUrl, {
                responseType: 'arraybuffer',
                timeout: 45000,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });

            const buffer = Buffer.from(imageResponse.data);
            console.log(`📥 [Bluestacks CMS][UploadImage] Imagen origen descargada: Status ${imageResponse.status} | Tamaño: ${buffer.length} bytes`);

            const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
            const uploadUrl = `https://${this.config.cmdUrl}/system/modules/com.tfsla.diario.base/templates/webservices/imagesAddService.jsp?token=${token}`;
            const maskedUploadUrl = `https://${this.config.cmdUrl}/system/modules/com.tfsla.diario.base/templates/webservices/imagesAddService.jsp?token=***`;

            const formData = new FormData();
            formData.append('site', this.config.site);
            formData.append('publication', this.config.publication);

            const blob = new Blob([buffer], { type: 'image/jpeg' });
            formData.append('file[0]', blob, cleanFileName);
            formData.append('file[0].name', cleanFileName);
            formData.append('file[0].description', description);
            formData.append('file[0].title', title);

            console.log(`📤 [Bluestacks CMS][UploadImage] REQUEST:`, JSON.stringify({
                method: 'POST',
                url: maskedUploadUrl,
                headers: { 'x-security-token': '***' },
                formDataFields: {
                    site: this.config.site,
                    publication: this.config.publication,
                    'file[0].name': cleanFileName,
                    'file[0].description': description,
                    'file[0].title': title,
                    fileSizeBytes: buffer.length
                }
            }, null, 2));

            const uploadStart = Date.now();
            const uploadResponse = await axios.post(uploadUrl, formData, {
                headers: {
                    'x-security-token': this.config.securityToken
                },
                timeout: 60000
            });
            const uploadDurationMs = Date.now() - uploadStart;

            const resData = uploadResponse.data;
            console.log(`📥 [Bluestacks CMS][UploadImage] RESPONSE (${uploadDurationMs}ms) Status ${uploadResponse.status}:`, JSON.stringify(resData, null, 2));

            const firstItem = Array.isArray(resData?.data) ? resData.data[0] : resData?.data;
            if (resData?.error || resData?.errors || resData?.status === 'error' || firstItem?.error || firstItem?.status === 'error') {
                throw new Error(`El CMS reportó un error al subir la imagen: ${JSON.stringify(resData)}`);
            }

            let cmsPath = resData?.path || firstItem?.name || firstItem?.path || resData?.name;
            if (!cmsPath) {
                throw new Error(`La respuesta de subida de imagen no contiene una ruta válida (path/name): ${JSON.stringify(resData)}`);
            }

            cmsPath = '/' + String(cmsPath).replace(/^(\/sites\/[^\/]+)?\//, '').replace(/^\/+/, '');
            console.log(`✅ [Bluestacks CMS][UploadImage] Imagen subida exitosamente. CMS Path: ${cmsPath}`);
            return cmsPath;
        } catch (error: any) {
            const totalDurationMs = Date.now() - startTime;
            console.error(`❌ [Bluestacks CMS][UploadImage] ERROR (${totalDurationMs}ms):`, JSON.stringify({
                message: error.message,
                sourceUrl: imageUrl,
                status: error.response?.status,
                statusText: error.response?.statusText,
                responseData: error.response?.data
            }, null, 2));
            throw new Error(`Error subiendo imagen a Bluestacks CMS: ${error.message}`);
        }
    }

    private formatParagraphHtml(content: string): string {
        if (!content) return '';
        const trimmed = content.trim();
        if (!trimmed) return '';

        // Si ya contiene etiquetas HTML de bloque (<p>, <h2>, <h3>, <blockquote>, <ul>, <ol>, <div>)
        if (/^<(p|h[1-6]|blockquote|div|ul|ol)\b/i.test(trimmed)) {
            return trimmed;
        }

        // Si contiene múltiples párrafos separados por doble salto de línea
        const rawParagraphs = trimmed
            .split(/\n\s*\n/)
            .map(p => p.trim())
            .filter(p => p.length > 0);

        if (rawParagraphs.length > 1) {
            return rawParagraphs
                .map(p => (/^<(p|h[1-6]|blockquote|div|ul|ol)\b/i.test(p) ? p : `<p>${p.replace(/\n/g, '<br/>')}</p>`))
                .join('\n');
        }

        return `<p>${trimmed.replace(/\n/g, '<br/>')}</p>`;
    }

    private buildCmsHtmlBody(blocks: NewsBlock[], uploadedImagePaths: Map<string, string>): string {
        const parts: string[] = [];

        for (const block of blocks) {
            if (block.type === 'paragraph' && block.content) {
                parts.push(this.formatParagraphHtml(block.content));
            } else if ((block.type === 'heading' || (block as any).type === 'subtitle') && block.content) {
                const text = block.content.replace(/^<[^>]+>|<\/[^>]+>$/g, '').trim();
                parts.push(`<h2>${text}</h2>`);
            } else if (block.type === 'image') {
                if (!block.url) {
                    throw new Error(`El bloque de imagen ${block.id} no tiene URL definida.`);
                }
                const cmsPath = uploadedImagePaths.get(block.url);
                if (!cmsPath) {
                    throw new Error(`No se encontró la ruta de imagen en el CMS para el bloque ${block.id} (${block.url}).`);
                }
                const alt = block.alt || block.caption || '';
                const caption = block.caption || '';

                const imageMacro = `<div style="text-align:center"><figure class="image" style="display:inline-block"><img alt="${alt}" data-size="w:1080,h:1290" data-width="1080" data-height="1290" hspace="5" src="${cmsPath}" title="${alt}" vspace="5"><figcaption>${caption}</figcaption></figure></div>`;
                parts.push(imageMacro);
            }
        }

        // Cierre editorial oficial estándar de Red+ Noticias
        parts.push(`<p>Gracias por leer Red+ Noticias. Lo invitamos a <a href="https://www.google.com/preferences/source?q=redmas.com.co" target="_blank" rel="nofollow">SEGUIRNOS EN GOOGLE o activar nuestras noticias</a> para no perderse sus informes y noticias favoritas.</p>`);

        return parts.join('\n');
    }

    async createNewsDraft(articleData: NewsArticleData): Promise<{ cmsPath: string; rawResponse: any }> {
        if (!articleData.title?.trim()) {
            throw new Error('El título de la noticia es obligatorio para crear el borrador en Bluestacks CMS.');
        }

        const token = await this.login();

        let cmsCoverPath = '';
        if (articleData.coverImage?.url) {
            cmsCoverPath = await this.uploadImage(
                articleData.coverImage.url,
                `cover-${Date.now()}.jpg`,
                articleData.coverImage.caption || articleData.title,
                articleData.title
            );
        }

        const uploadedImagesMap = new Map<string, string>();
        if (articleData.blocks && Array.isArray(articleData.blocks)) {
            for (const block of articleData.blocks) {
                if (block.type === 'image' && block.url && !uploadedImagesMap.has(block.url)) {
                    const blockCmsPath = await this.uploadImage(
                        block.url,
                        `block-${block.id}-${Date.now()}.jpg`,
                        block.caption || articleData.title,
                        block.alt || articleData.title
                    );
                    uploadedImagesMap.set(block.url, blockCmsPath);
                }
            }
        }

        const cuerpoHtml = this.buildCmsHtmlBody(articleData.blocks || [], uploadedImagesMap);
        const clavesStr = Array.isArray(articleData.tags) ? articleData.tags.join(', ') : (articleData.tags || '');
        const seccionStr = (articleData.section || '')
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]/g, '');

        const payload = {
            site: this.config.site,
            publication: this.config.publication,
            data: [
                [
                    { "titulo[1]": articleData.title },
                    { "copete": articleData.subtitle || "" },
                    { "cuerpo": cuerpoHtml },
                    { "claves": clavesStr },
                    { "autor[1]/nombre": articleData.author || "" },
                    { "autor[1]/internalUser": "" },
                    { "seccion": seccionStr },
                    { "zonahome": "destacadas" },
                    { "prioridadhome": "2" },
                    { "fotoenhome": "horizontal" },
                    { "fotoNota": "2 Columnas" },
                    { "Visibilidad": "público" },
                    {
                        "imagenPrevisualizacion[1]/imagen": cmsCoverPath,
                        "imagenPrevisualizacion[1]/descripcion": articleData.coverImage?.caption || articleData.title
                    }
                ]
            ]
        };

        const addNewsUrl = `https://${this.config.cmdUrl}/system/modules/com.tfsla.diario.base/templates/webservices/newsAddService.jsp?token=${token}`;
        const maskedAddNewsUrl = `https://${this.config.cmdUrl}/system/modules/com.tfsla.diario.base/templates/webservices/newsAddService.jsp?token=***`;

        console.log(`📤 [Bluestacks CMS][CreateNews] REQUEST:`, JSON.stringify({
            method: 'POST',
            url: maskedAddNewsUrl,
            headers: {
                'Content-Type': 'application/json',
                'x-security-token': '***'
            },
            payload
        }, null, 2));

        const startTime = Date.now();
        try {
            const response = await axios.post(addNewsUrl, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'x-security-token': this.config.securityToken
                },
                timeout: 60000
            });
            const durationMs = Date.now() - startTime;

            const resData = response.data;
            console.log(`📥 [Bluestacks CMS][CreateNews] RESPONSE (${durationMs}ms) Status ${response.status}:`, JSON.stringify(resData, null, 2));

            const firstItem = Array.isArray(resData?.data) ? resData.data[0] : resData?.data;
            if (resData?.error || resData?.errors || resData?.status === 'error' || firstItem?.error || firstItem?.status === 'error') {
                throw new Error(`El CMS devolvió un error al crear la noticia: ${JSON.stringify(resData)}`);
            }

            const cmsPath = resData?.path || firstItem?.name || firstItem?.path || resData?.name;
            if (!cmsPath) {
                throw new Error(`El CMS no devolvió una ruta (path/name) válida al crear la noticia: ${JSON.stringify(resData)}`);
            }

            console.log(`✅ [Bluestacks CMS][CreateNews] Noticia creada exitosamente en CMS. Path: ${cmsPath}`);
            return {
                cmsPath: String(cmsPath),
                rawResponse: resData
            };
        } catch (error: any) {
            const durationMs = Date.now() - startTime;
            console.error(`❌ [Bluestacks CMS][CreateNews] ERROR (${durationMs}ms):`, JSON.stringify({
                message: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                responseHeaders: error.response?.headers,
                responseData: error.response?.data
            }, null, 2));
            throw new Error(`Error creando noticia en Bluestacks CMS: ${error.message}`);
        }
    }

    async publishNews(newsCmsPath: string): Promise<any> {
        if (!newsCmsPath?.trim()) {
            throw new Error('La ruta newsCmsPath es obligatoria para publicar la noticia en Bluestacks CMS.');
        }

        const token = await this.login();
        const publishUrl = `https://${this.config.cmdUrl}/system/modules/com.tfsla.diario.base/templates/webservices/newsPublishService.jsp?token=${token}`;
        const maskedPublishUrl = `https://${this.config.cmdUrl}/system/modules/com.tfsla.diario.base/templates/webservices/newsPublishService.jsp?token=***`;

        const publishPayload = {
            site: this.config.site,
            data: [
                { url: newsCmsPath }
            ]
        };

        console.log(`📤 [Bluestacks CMS][PublishNews] REQUEST:`, JSON.stringify({
            method: 'POST',
            url: maskedPublishUrl,
            headers: {
                'Content-Type': 'application/json',
                'x-security-token': '***'
            },
            payload: publishPayload
        }, null, 2));

        const startTime = Date.now();
        try {
            const response = await axios.post(publishUrl, publishPayload, {
                headers: {
                    'Content-Type': 'application/json',
                    'x-security-token': this.config.securityToken
                },
                timeout: 60000
            });
            const durationMs = Date.now() - startTime;

            const resData = response.data;
            console.log(`📥 [Bluestacks CMS][PublishNews] RESPONSE (${durationMs}ms) Status ${response.status}:`, JSON.stringify(resData, null, 2));

            if (!resData || typeof resData !== 'object') {
                throw new Error(`Respuesta inválida del servicio de publicación de Bluestacks CMS: ${JSON.stringify(resData)}`);
            }

            const firstItem = Array.isArray(resData?.data) ? resData.data[0] : resData?.data;
            if (
                resData?.error ||
                resData?.errors ||
                resData?.status === 'error' ||
                firstItem?.error ||
                firstItem?.errors ||
                firstItem?.status === 'error' ||
                firstItem?.published === false
            ) {
                throw new Error(`Bluestacks CMS rechazó la publicación de la noticia: ${JSON.stringify(resData)}`);
            }

            console.log(`✅ [Bluestacks CMS][PublishNews] Noticia publicada exitosamente en CMS: ${newsCmsPath}`);
            return resData;
        } catch (error: any) {
            const durationMs = Date.now() - startTime;
            console.error(`❌ [Bluestacks CMS][PublishNews] ERROR (${durationMs}ms):`, JSON.stringify({
                message: error.message,
                newsCmsPath,
                status: error.response?.status,
                statusText: error.response?.statusText,
                responseHeaders: error.response?.headers,
                responseData: error.response?.data
            }, null, 2));
            throw new Error(`Error publicando noticia en Bluestacks CMS: ${error.message}`);
        }
    }

    async getPublishedNewsUrl(newsCmsPath: string): Promise<string> {
        const token = await this.login();
        const listUrl = `https://${this.config.cmdUrl}/system/modules/com.tfsla.diario.base/templates/webservices/newsListService.jsp`;
        const cleanPath = newsCmsPath.replace(/^\/sites\/[^\/]+/, '');

        const fetchDetails = async (attempt: number) => {
            console.log(`📤 [Bluestacks CMS][GetPublishedUrl] REQUEST (Intento ${attempt}):`, JSON.stringify({
                method: 'GET',
                url: listUrl,
                params: {
                    token: '***',
                    site: this.config.site,
                    url: cleanPath
                },
                headers: {
                    'x-security-token': '***'
                }
            }, null, 2));

            const startTime = Date.now();
            const response = await axios.get(listUrl, {
                params: {
                    token,
                    site: this.config.site,
                    url: cleanPath
                },
                headers: {
                    'x-security-token': this.config.securityToken
                },
                timeout: 30000
            });
            const durationMs = Date.now() - startTime;

            console.log(`📥 [Bluestacks CMS][GetPublishedUrl] RESPONSE (Intento ${attempt}, ${durationMs}ms) Status ${response.status}:`, JSON.stringify(response.data, null, 2));

            const first = response.data?.data?.[0];
            return first?.urlFriendly || null;
        };

        try {
            let attempt = 1;
            let urlFriendly = await fetchDetails(attempt);

            while ((!urlFriendly || urlFriendly.includes('/noticia/-')) && attempt <= 3) {
                await new Promise(r => setTimeout(r, 2000));
                attempt++;
                urlFriendly = await fetchDetails(attempt);
            }

            if (!urlFriendly || urlFriendly.includes('/noticia/-')) {
                throw new Error(`El CMS no devolvió un urlFriendly válido para la noticia ${newsCmsPath}`);
            }

            const finalUrl = urlFriendly.startsWith('http')
                ? urlFriendly
                : `${this.config.publicUrl}${urlFriendly.startsWith('/') ? urlFriendly : `/${urlFriendly}`}`;

            console.log(`✅ [Bluestacks CMS][GetPublishedUrl] URL pública resuelta: ${finalUrl}`);
            return finalUrl;
        } catch (error: any) {
            console.error(`❌ [Bluestacks CMS][GetPublishedUrl] ERROR:`, JSON.stringify({
                message: error.message,
                newsCmsPath,
                status: error.response?.status,
                statusText: error.response?.statusText,
                responseData: error.response?.data
            }, null, 2));
            throw new Error(`Error obteniendo la URL pública de la noticia en Bluestacks CMS: ${error.message}`);
        }
    }
}


