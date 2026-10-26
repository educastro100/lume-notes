# Suspensão de distribuição — Lume Notes 0.10.0

A versão 0.10.0 está bloqueada para novas publicações pelos scripts locais. Não reinstalar nem restaurar itens em quarentena durante a investigação. A publicação já existente no GitHub não foi alterada por esta ação local.

## Evidências anteriores à publicação

- Workflow privado 38990491889, commit a47bc86ccb8b5ab0f8c28c0035c29411e6529a33.
- Nove arquivos nativos examinados no Actions, todos com saída explícita `found no threats`; conteúdo do instalador conferido com o build.
- Logs locais registram atualização das definições e três varreduras explícitas sem ameaças: instalador, aplicativo extraído e verificador.
- Assinatura do atualizador, versão vinculada à assinatura, rejeição de adulteração e de versão divergente verificadas.
- O instalador final manteve o SHA-256 do CI: `50f8bfcdfffd2114f7db98296636c6a93802637078a991d83fcd6ff100ed2041`.
- Hash do aplicativo registrado no candidato: `e0ce3d5ad7557a8cc1ab6442d0ab419de2bd8dffbd53ddc60022912829030314`.
- Não foi realizado teste final da instalação 0.10.0 pelo agente antes da publicação. O usuário informou sucesso na atualização e depois relatou nova remoção pelo Windows.

## Nova ocorrência

O usuário informou a mesma ameaça da ocorrência anterior, Trojan:Win32/Bearfoos.A!ml. O histórico do Defender não pôde ser consultado neste ambiente: acesso negado. O nome completo desta nova ocorrência baseia-se no relato do usuário.

Uma tentativa de calcular o SHA-256 de `releases/0.10.0/candidate-859458b59cdb424bac65bfe83e8c43d0/lume-notes.exe` foi bloqueada pelo Windows com a mensagem: “Não foi possível concluir a operação com êxito porque o arquivo contém um vírus ou software possivelmente indesejado”. O hash atual não pôde ser recalculado. Não houve execução do aplicativo nem do instalador nessa investigação.

O usuário pediu para não repetir a varredura do Windows; nenhuma nova varredura manual foi iniciada. Não foram alteradas proteções, criadas exclusões ou restaurados arquivos em quarentena.

## Limites e próximos passos

Não há conclusão de falso positivo nem comprovação da causa raiz. Assinatura do atualizador confirma autenticidade e integridade; não constitui liberação pelo Microsoft Defender ou assinatura Windows Authenticode.

A proteção em tempo real do runner estava desativada conforme o diagnóstico, embora as varreduras explícitas tenham sido concluídas. Esse resultado não valida a experiência do aplicativo instalado com todas as camadas de proteção do Windows.

Recomenda-se suspender a release pública 0.10.0 enquanto a ocorrência é investigada. A autenticação do GitHub e a alteração pública devem ser feitas no contexto normal do Windows; não foram acessadas credenciais nesta investigação. Preservar notas e preferências. Não reconstruir, reempacotar ou modificar o binário apenas para contornar a detecção.

## Comparação com a 0.9.1 após a recorrência

A comparação Git dos commits compilados 084e1c8b9af4bfe82c834682022c26ef051e2ea5 e a47bc86ccb8b5ab0f8c28c0035c29411e6529a33 confirmou:

- Os 371 registros de pacotes npm, fora o pacote raiz, são idênticos: versões, origens e integridades não mudaram. A extensão de código Tiptap apenas passou a ser declarada diretamente; já constava no lock.
- Cargo.lock não muda versões nem checksums de dependências Rust; apenas a versão do próprio Lume.
- Hooks NSIS, capabilities, build.rs e workflow de release são idênticos.
- Além da versão, a mudança nativa consiste em um comando que mapeia os identificadores `issues` e `project` a duas URLs HTTPS fixas, reutilizando a abertura pelo Windows que já existia na 0.9.1. Não aceita caminhos ou comandos arbitrários.
- A revisão do código próprio não encontrou alteração para executar scripts, criar serviços/inicialização automática ou modificar o Defender.
- A consulta `npm audit --omit=dev` retornou zero vulnerabilidades conhecidas. Isso é uma consulta de avisos das dependências, não uma análise antimalware.

Os registros da 0.9.1 também indicam que o teste de atualização pela rede ocorreu depois da publicação. Assim, a ausência de teste de instalação prévio na 0.10.0 é uma limitação do processo, mas não demonstra a causa da nova detecção.

Não foi encontrada uma correção de código que possa ser atribuída ao alerta com evidência. Remover funcionalidades, trocar o empacotador ou recompilar apenas para produzir outro hash não constituiria uma correção comprovada. O texto técnico de uma possível revisão pela Microsoft foi preparado, mas nenhum arquivo foi enviado; o usuário descartou esse encaminhamento como próximo passo.

O próximo diagnóstico implementado é **Comparar instalacao Windows**, documentado em `docs/diagnostico-instalacao.md`. Ele utiliza os dois instaladores públicos originais, com hashes fixados, em runners separados com proteção ativa. Testa download, instalação e abertura, preservando os eventos e a etapa de falha. Não recompila o app, não publica uma versão e não executa o teste no computador do usuário. A criação desse teste ainda não representa a execução nem a correção da causa do alerta.

Canal oficial: https://www.microsoft.com/en-us/wdsi/filesubmission

## Resultado da comparação instalada — execução 38995686741

Os relatórios das versões 0.9.1 e 0.10.0 confirmam os hashes originais dos instaladores e executáveis instalados. Ambos apresentaram janela e permaneceram ativos durante 60 segundos. Antes e depois, as proteções local, comportamental e de acesso estavam ativas; motor `1.1.26090.9`, plataforma `4.18.26090.9`, definições `1.461.64.0`. Não há eventos registrados nem erro de consulta ao histórico nos relatórios.

Nos dois runners, porém, as preferências eram `MAPSReporting=0`, `SubmitSamplesConsent=2`, `DisableBlockAtFirstSeen=true`. Portanto, a proteção em nuvem e o bloqueio à primeira vista não foram testados. Não foram consultadas novamente as preferências ou o antivírus do computador do usuário; não é possível afirmar que essa diferença seja a causa da ocorrência local.

O diagnóstico foi ajustado para exigir e verificar proteção em nuvem, envio de amostras seguras e conexão MAPS no runner. A origem Internet do instalador também é registrada em um fluxo NTFS separado, mantendo o hash dos bytes publicados. O teste continua limitado a artefatos já públicos; não utiliza fontes do editor, chaves ou notas do usuário. Nenhuma execução local do Defender ou do aplicativo foi feita para essa alteração. A causa do alerta permanece aberta até obter evidência de reprodução ou outra análise conclusiva.

## Falha de conectividade — execução 38996366055

Ambos os relatórios mostram Internet disponível, definições `1.461.64.0`, proteções locais ativas e preferências MAPS `2/1/false` depois da configuração. Ambos falham com `0x80508015` na conexão MAPS, antes de qualquer download ou instalação do Lume. Isso não demonstra uma diferença entre os aplicativos nem a causa da detecção local. A saída aponta para o log interno `MpCmdRun.log`, que não foi anexado naquela execução; a causa precisa da falha de conectividade não pode ser determinada apenas pelos arquivos recebidos.

O script oficial de preparo das imagens GitHub adiciona exclusões para `C:\` e `D:\`. Os testes anteriores não coletavam ou verificavam essas preferências, o que é outra limitação da cobertura antimalware. Isso não invalida os resultados explícitos das varreduras personalizadas anteriores com `-DisableRemediation`, que ignoram exclusões, mas impede usar somente a instalação/abertura no runner como comprovação de proteção efetiva.

O diagnóstico agora registra e verifica exclusões, remove somente as exclusões de unidade conhecidas no runner temporário e preserva o log interno disponível. Nenhum novo workflow foi iniciado para essa mudança. A coleta local de histórico foi revisada para incluir as preferências de nuvem, sem varredura ou alteração de proteção. O nome da ameaça já é conhecido pelo relato; os recursos afetados, horários e ações locais são necessários para correlacionar a ocorrência com a versão distribuída.

Fontes: [configuração oficial da imagem GitHub](https://github.com/actions/runner-images/blob/main/images/windows/scripts/build/Configure-WindowsDefender.ps1) e [diagnóstico de conectividade do Defender](https://learn.microsoft.com/en-us/defender-endpoint/configure-network-connections-microsoft-defender-antivirus).

## Complemento — histórico de proteção apresentado pelo usuário

O print posterior identifica `Trojan:Win32/Bearfoos.B!ml` em 16/10/2026 às 23:53, status Removido, no instalador `Lume-Notes-0.10.0-Windows-x64-setup.exe` da pasta Downloads. A variante A mencionada antes se baseava no relato inicial por comparação com a ocorrência anterior. Este registro comprova o bloqueio do instalador baixado, sem demonstrar por si só a remoção do executável instalado. O alerta genérico não revela a regra ou o comportamento exato que motivou a classificação.

Em 26/10/2026, o projeto passou a preparar a abertura do código sob MIT e a avaliar assinatura Authenticode. Isso não encerra a investigação dos pacotes já bloqueados nem constitui um certificado obtido.
