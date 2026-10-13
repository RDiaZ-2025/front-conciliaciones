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

        const publicUrl = process.env.BLUESTACK_PUBLIC_URL?.trim() || 'https://redmas.com.co';
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
    }

    async login(): Promise<string> {
        if (this.cachedToken && Date.now() < this.tokenExpiry) {
            return this.cachedToken;
        }

        try {
            const loginUrl = `https://${this.config.cmdUrl}/system/modules/com.tfsla.diario.base/templates/webservices/authorizationService.jsp`;
            console.log(`[Bluestacks CMS] Authenticating user: ${this.config.username}...`);

            const response = await axios.get(loginUrl, {
                params: {
                    username: this.config.username,
                    password: this.config.password,
                    site: this.config.site,
                    publication: this.config.publication
                },
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'x-security-token': this.config.securityToken
                },
                timeout: 30000
            });

            if (response.data && response.data.token) {
                const tokenStr = String(response.data.token);
                this.cachedToken = tokenStr;
                this.tokenExpiry = Date.now() + 10 * 60 * 1000;
                console.log(`[Bluestacks CMS] Authentication successful.`);
                return tokenStr;
            }

            throw new Error(`Respuesta de login inesperada: ${JSON.stringify(response.data)}`);
        } catch (error: any) {
            console.error(`[Bluestacks CMS] Login error:`, error.message);
            throw new Error(`Error autenticando en Bluestacks CMS: ${error.message}`);
        }
    }

    async uploadImage(imageUrl: string, fileName?: string, description?: string, title?: string): Promise<string> {
        const token = await this.login();
        try {
            console.log(`[Bluestacks CMS] Downloading image buffer from: ${imageUrl.substring(0, 60)}...`);
            const imageResponse = await axios.get(imageUrl, {
                responseType: 'arraybuffer',
                timeout: 45000,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });

            const buffer = Buffer.from(imageResponse.data);
            const cleanFileName = (fileName || `img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.jpg`).replace(/[^a-zA-Z0-9._-]/g, '_');
            const cleanDesc = description || cleanFileName;
            const cleanTitle = title || cleanFileName;

            const uploadUrl = `https://${this.config.cmdUrl}/system/modules/com.tfsla.diario.base/templates/webservices/imagesAddService.jsp?token=${token}`;

            const formData = new FormData();
            formData.append('site', this.config.site);
            formData.append('publication', this.config.publication);

            const blob = new Blob([buffer], { type: 'image/jpeg' });
            formData.append('file[0]', blob, cleanFileName);
            formData.append('file[0].name', cleanFileName);
            formData.append('file[0].description', cleanDesc);
            formData.append('file[0].title', cleanTitle);

            console.log(`[Bluestacks CMS] Uploading image to CMS: ${cleanFileName}...`);
            const uploadResponse = await axios.post(uploadUrl, formData, {
                headers: {
                    'x-security-token': this.config.securityToken
                },
                timeout: 60000
            });

            const resData = uploadResponse.data;
            const firstItem = Array.isArray(resData?.data) ? resData.data[0] : resData?.data;
            let cmsPath = resData?.path || firstItem?.name || firstItem?.path || resData?.name;

            if (cmsPath) {

                cmsPath = '/' + cmsPath.replace(/^(\/sites\/[^\/]+)?\//, '').replace(/^\/+/, '');
                console.log(`[Bluestacks CMS] Image uploaded successfully. CMS Path: ${cmsPath}`);
                return cmsPath;
            }

            console.warn(`[Bluestacks CMS] Image upload response without direct path:`, resData);
            return imageUrl;
        } catch (error: any) {
            console.error(`[Bluestacks CMS] Error uploading image to CMS:`, error.message);
            return imageUrl;
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
                const cmsPath = (block.url ? uploadedImagePaths.get(block.url) : null) || block.url || '';
                const alt = block.alt || block.caption || 'Fotografía de prensa';
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
        const clavesStr = Array.isArray(articleData.tags) ? articleData.tags.join(', ') : (articleData.tags || 'noticias, actualidad');
        const seccionStr = (articleData.section || 'colombia')
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
                    { "autor[1]/nombre": articleData.author || "Redacción Red+" },
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

        try {
            const addNewsUrl = `https://${this.config.cmdUrl}/system/modules/com.tfsla.diario.base/templates/webservices/newsAddService.jsp?token=${token}`;
            console.log(`[Bluestacks CMS] Creating news draft in CMS: "${articleData.title}"...`);

            const response = await axios.post(addNewsUrl, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'x-security-token': this.config.securityToken
                },
                timeout: 60000
            });

            const resData = response.data;
            const firstItem = Array.isArray(resData?.data) ? resData.data[0] : resData?.data;
            const cmsPath = resData?.path || firstItem?.name || firstItem?.path || resData?.name;

            console.log(`[Bluestacks CMS] News draft created successfully. Path: ${cmsPath}`);
            return {
                cmsPath: cmsPath || '',
                rawResponse: resData
            };
        } catch (error: any) {
            console.error(`[Bluestacks CMS] Error creating news in CMS:`, error.message);
            throw new Error(`Error creando noticia en Bluestacks CMS: ${error.message}`);
        }
    }

    async publishNews(newsCmsPath: string): Promise<any> {
        const token = await this.login();
        try {
            const publishUrl = `https://${this.config.cmdUrl}/system/modules/com.tfsla.diario.base/templates/webservices/newsPublishService.jsp?token=${token}`;
            console.log(`[Bluestacks CMS] Publishing news: ${newsCmsPath}...`);

            const response = await axios.post(publishUrl, {
                site: this.config.site,
                data: [
                    { url: newsCmsPath }
                ]
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'x-security-token': this.config.securityToken
                },
                timeout: 60000
            });

            console.log(`[Bluestacks CMS] News published successfully.`);
            return response.data;
        } catch (error: any) {
            console.error(`[Bluestacks CMS] Error publishing news:`, error.message);
            throw new Error(`Error publicando noticia en Bluestacks CMS: ${error.message}`);
        }
    }

    async getPublishedNewsUrl(newsCmsPath: string): Promise<string | null> {
        const token = await this.login();
        try {
            const listUrl = `https://${this.config.cmdUrl}/system/modules/com.tfsla.diario.base/templates/webservices/newsListService.jsp`;
            const cleanPath = newsCmsPath.replace(/^\/sites\/[^\/]+/, '');

            const fetchDetails = async () => {
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
                const first = response.data?.data?.[0];
                return first?.urlFriendly || null;
            };

            let urlFriendly = await fetchDetails();

            // Si el CMS tarda unos instantes en indexar el slug amigable o devuelve un slug temporal incompleto (ej. /noticia/-...)
            let attempts = 0;
            while ((!urlFriendly || urlFriendly.includes('/noticia/-')) && attempts < 3) {
                await new Promise(r => setTimeout(r, 2000));
                urlFriendly = await fetchDetails();
                attempts++;
            }

            if (urlFriendly) {
                const cleanFriendly = urlFriendly.startsWith('/') ? urlFriendly : `/${urlFriendly}`;
                const finalUrl = `${this.config.publicUrl}${cleanFriendly}`;
                console.log(`[Bluestacks CMS] Resolved public URL: ${finalUrl}`);
                return finalUrl;
            }

            const cleanRelPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
            const fallbackUrl = `${this.config.publicUrl}${cleanRelPath}`;
            console.log(`[Bluestacks CMS] Fallback public URL: ${fallbackUrl}`);
            return fallbackUrl;
        } catch (error: any) {
            console.error(`[Bluestacks CMS] Error getting published news URL for ${newsCmsPath}:`, error.message);
            const cleanRelPath = newsCmsPath.replace(/^\/sites\/[^\/]+/, '');
            return `${this.config.publicUrl}${cleanRelPath.startsWith('/') ? cleanRelPath : `/${cleanRelPath}`}`;
        }
    }
}

